"""Reduce the reservoir mesh while preserving its CAD silhouette."""

from math import radians
from pathlib import Path

import bpy


ROOT = Path(__file__).parents[1]
MODEL = ROOT / "public/protobot-models/pnmatics/NewRes.fbx"
TARGET_TRIANGLES = 10_000

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(MODEL))

meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
before = sum(len(poly.vertices) - 2 for item in meshes for poly in item.data.polygons)

for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # CAD exporters often triangulate large flat faces. Dissolve those internal
    # edges without changing the outline or curved surfaces.
    modifier = obj.modifiers.new(name="Dissolve coplanar CAD edges", type="DECIMATE")
    modifier.decimate_type = "DISSOLVE"
    modifier.angle_limit = radians(0.5)
    bpy.ops.object.modifier_apply(modifier=modifier.name)

coplanar_count = sum(len(poly.vertices) - 2 for item in meshes for poly in item.data.polygons)
if coplanar_count > TARGET_TRIANGLES:
    ratio = TARGET_TRIANGLES / coplanar_count
    for obj in meshes:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new(name="Reservoir triangle budget", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)

after = sum(len(poly.vertices) - 2 for item in meshes for poly in item.data.polygons)
if after > TARGET_TRIANGLES:
    raise RuntimeError(f"Optimization missed target: {after} triangles")

bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.ops.export_scene.fbx(
    filepath=str(MODEL),
    use_selection=True,
    apply_unit_scale=False,
    add_leaf_bones=False,
    path_mode="AUTO",
)
print(f"Reservoir: {before} -> {after} triangles ({coplanar_count} after planar dissolve)")
