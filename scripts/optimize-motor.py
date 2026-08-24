"""Remove hidden motor internals and redundant coplanar CAD tessellation."""

from math import radians
from pathlib import Path

import bpy
import bmesh


ROOT = Path(__file__).parents[1]
MODEL = ROOT / "public/protobot-models/Electronics/Motor.fbx"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(MODEL))

obj = next(item for item in bpy.context.scene.objects if item.type == "MESH")
mesh = obj.data
mesh.calc_loop_triangles()
before = len(mesh.loop_triangles)

# The source CAD contains two detailed mechanical shells fully enclosed by the
# upper motor housing. Identify them by their stable triangle counts rather than
# Blender's arbitrary vertex indices.
bm = bmesh.new()
bm.from_mesh(mesh)
unseen = set(bm.verts)
hidden_triangle_counts = {4422, 1536}
removed = 0
while unseen:
    seed = unseen.pop()
    component = {seed}
    frontier = [seed]
    while frontier:
        vertex = frontier.pop()
        for edge in vertex.link_edges:
            neighbor = edge.other_vert(vertex)
            if neighbor in unseen:
                unseen.remove(neighbor)
                component.add(neighbor)
                frontier.append(neighbor)
    faces = {face for vertex in component for face in vertex.link_faces}
    triangles = sum(max(1, len(face.verts) - 2) for face in faces)
    if triangles in hidden_triangle_counts:
        removed += triangles
        bmesh.ops.delete(bm, geom=list(component), context="VERTS")
bm.to_mesh(mesh)
bm.free()
mesh.update()

# CAD exports split large flat surfaces into many triangles. Dissolving only
# coplanar edges preserves the outline and curved sections.
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
modifier = obj.modifiers.new(name="Dissolve coplanar CAD edges", type="DECIMATE")
modifier.decimate_type = "DISSOLVE"
modifier.angle_limit = radians(0.5)
bpy.ops.object.modifier_apply(modifier=modifier.name)

mesh.calc_loop_triangles()
coplanar_count = len(mesh.loop_triangles)
if coplanar_count >= 30_000:
    # The source normals mark almost every CAD edge as sharp, so a planar pass
    # alone cannot meet the budget. Apply a restrained collapse to the exterior
    # shells, leaving some headroom below 30k for importer differences.
    modifier = obj.modifiers.new(name="Exterior triangle budget", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = 28_500 / coplanar_count
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)

mesh.calc_loop_triangles()
after = len(mesh.loop_triangles)
if after >= 30_000:
    raise RuntimeError(f"Optimization missed target: {after} triangles")

bpy.ops.export_scene.fbx(
    filepath=str(MODEL),
    use_selection=True,
    apply_unit_scale=False,
    add_leaf_bones=False,
    path_mode="AUTO",
)
print(f"Motor: {before} -> {after} triangles; removed {removed} hidden triangles")
