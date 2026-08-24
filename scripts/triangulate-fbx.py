import bpy
import sys

source = sys.argv[-2]
destination = sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=source)

for obj in bpy.context.scene.objects:
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new(name='Triangulate', type='TRIANGULATE')
    modifier.quad_method = 'BEAUTY'
    modifier.ngon_method = 'BEAUTY'
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)

bpy.ops.export_scene.fbx(
    filepath=destination,
    use_selection=False,
    use_mesh_modifiers=True,
    mesh_smooth_type='EDGE',
    use_triangles=True,
    add_leaf_bones=False,
)
