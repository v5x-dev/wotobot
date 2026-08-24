import { describe, expect, it } from 'vitest'
import { parseStepMetadata } from './stepMetadataParser'

const ASSEMBLY_STEP = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('AUTOMOTIVE_DESIGN_CC2'));
ENDSEC;
DATA;
#1=PRODUCT('root-id','Robot','',());
#2=PRODUCT_DEFINITION_FORMATION('','',#1);
#3=PRODUCT_DEFINITION('','',#2,#900);
#4=PRODUCT('part-id','Bracket','Steel bracket',());
#5=PRODUCT_DEFINITION_FORMATION_WITH_SPECIFIED_SOURCE('','',#4,.NOT_KNOWN.);
#6=PRODUCT_DEFINITION('','',#5,#900);
#10=NEXT_ASSEMBLY_USAGE_OCCURRENCE('instance-1','Left bracket','',#3,#6,$);
#11=PRODUCT_DEFINITION_SHAPE('','',#10);
#12=CONTEXT_DEPENDENT_SHAPE_REPRESENTATION(#13,#11);
#13=(REPRESENTATION_RELATIONSHIP('','',#800,#801) REPRESENTATION_RELATIONSHIP_WITH_TRANSFORMATION(#14) SHAPE_REPRESENTATION_RELATIONSHIP());
#14=ITEM_DEFINED_TRANSFORMATION('','',#15,#16);
#15=AXIS2_PLACEMENT_3D('',#20,#21,#22);
#16=AXIS2_PLACEMENT_3D('',#23,#21,#24);
#20=CARTESIAN_POINT('',(0.,0.,0.));
#21=DIRECTION('',(0.,0.,1.));
#22=DIRECTION('',(1.,0.,0.));
#23=CARTESIAN_POINT('',(10.,20.,30.));
#24=DIRECTION('',(0.,1.,0.));
#1000=ADVANCED_FACE('',(#1001),#1002,.T.);
#1001=CARTESIAN_POINT('',(999.,999.,999.));
#1100=(LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.));
ENDSEC;
END-ISO-10303-21;`

describe('parseStepMetadata', () => {
  it('extracts AP214 assembly occurrences and transforms without geometry', () => {
    const result = parseStepMetadata(ASSEMBLY_STEP)

    expect(result).toEqual({
      schema: 'AUTOMOTIVE_DESIGN_CC2',
      units: 'millimeter',
      parts: [{
        instanceId: 'instance-1',
        productId: 'part-id',
        name: 'Left bracket',
        description: 'Steel bracket',
        kind: 'part',
        path: ['Robot', 'Left bracket'],
        position: [10, 20, 30],
        rotation: [0, 0, 90],
        basis: [0, -1, 0, 1, 0, 0, 0, 0, 1],
      }],
    })
    expect(JSON.stringify(result)).not.toContain('999')
    expect(JSON.stringify(result)).not.toContain('ADVANCED_FACE')
  })

  it('returns standalone AP242 products and decodes STEP Unicode', () => {
    const result = parseStepMetadata(`ISO-10303-21;
HEADER;FILE_SCHEMA(('AP242_MANAGED_MODEL_BASED_3D_ENGINEERING_MIM_LF'));ENDSEC;
DATA;
#1=PRODUCT('P-1','C\\X2\\00E9\\X0\\ bracket','',());
#2=PRODUCT_DEFINITION_FORMATION('','',#1);
#3=PRODUCT_DEFINITION('','',#2,#9);
ENDSEC;END-ISO-10303-21;`)

    expect(result.parts).toEqual([{
      instanceId: '3',
      productId: 'P-1',
      name: 'Cé bracket',
      kind: 'part',
      path: ['Cé bracket'],
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      basis: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    }])
  })

  it('extracts XYZ Euler angles from a non-planar Onshape placement basis', () => {
    const result = parseStepMetadata(`${ASSEMBLY_STEP.replace(
      "#16=AXIS2_PLACEMENT_3D('',#23,#21,#24);",
      "#16=AXIS2_PLACEMENT_3D('',#23,#25,#26);\n#25=DIRECTION('',(1.,0.,0.));\n#26=DIRECTION('',(0.,-0.0222397278,0.9997526667));",
    )}`)

    expect(result.parts[0].rotation[0]).toBeCloseTo(-178.725652, 5)
    expect(result.parts[0].rotation[1]).toBe(90)
    expect(result.parts[0].rotation[2]).toBe(0)
  })

  it('reports monotonic scan progress', () => {
    const progress: number[] = []
    parseStepMetadata(ASSEMBLY_STEP, (percent) => progress.push(percent))
    expect(progress.at(-1)).toBe(100)
    expect(progress.every((value, index) => index === 0 || value >= progress[index - 1])).toBe(true)
  })
})
