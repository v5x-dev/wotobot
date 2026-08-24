"""Print connected-component statistics for the 11W motor FBX."""

from pathlib import Path

import bpy
import bmesh


MODEL = Path(__file__).parents[1] / "public/protobot-models/Electronics/Motor.fbx"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.fbx(filepath=str(MODEL))

for obj in (item for item in bpy.context.scene.objects if item.type == "MESH"):
    mesh = obj.data
    mesh.calc_loop_triangles()
    print(f"{obj.name}: {len(mesh.vertices)} vertices, {len(mesh.loop_triangles)} triangles")

    bm = bmesh.new()
    bm.from_mesh(mesh)
    unseen = set(bm.verts)
    components = []
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
        low = tuple(min(vertex.co[axis] for vertex in component) for axis in range(3))
        high = tuple(max(vertex.co[axis] for vertex in component) for axis in range(3))
        components.append((triangles, len(component), low, high))
    bm.free()

    for index, (triangles, vertices, low, high) in enumerate(sorted(components, reverse=True), 1):
        print(f"  {index:2}: {triangles:5} tris, {vertices:5} verts, bbox {low} to {high}")
