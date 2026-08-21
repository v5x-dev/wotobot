#!/usr/bin/env python3
"""Extract hole templates and part weights from Protobot Unity prefabs."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path("/home/pingu/Work/contrib/Protobot-Rebuilt")
PREFABS = ROOT / "Assets/Resources/Part Prefabs"
OUT = Path("/home/pingu/Work/r3f/protobot-web/src")

PART_TYPE = "20517603e29e5ac47a06559006a99763"
PART_DATA = "eef8f5de2cc508f409ba021e27e5a351"
HOLE_COL = "9292031b68cb53740b5f8a3cc6cbbfdc"
PART_NAME = "7c70d59fbaa6e7d4d89b42b9cfbcf475"
ALUMINUM_SUB = "133ba897aa8242a5a91e0dbd0f67d972"
MOTOR = None  # filled if we find Motor.cs.meta

GEN = {
    "b7957e962a0d84746a280d461064ce5b": "aluminum",
    "50dda47cdfb14113b39093c2d6da1590": "single",
    "f7484347a8d1d024f92b7bd05efe7df5": "child",
    "16e25214db6af3c42942b75c6601f832": "plate",
    "2291cbbee73836d4ab447f39a062f84d": "shaft",
}

FOLDER_GROUP = {
    "1Competition": "Competition",
    "2Electronics": "Electronics",
    "3Pneumatics": "Pneumatics",
    "4Motion": "Motion",
    "5Structure": "Structure",
}

DOC_SPLIT = re.compile(r"^--- !u!(\d+) &(-?\d+)", re.M)
VEC3 = re.compile(r"\{x: ([-\d.eE]+), y: ([-\d.eE]+), z: ([-\d.eE]+)\}")
VEC4 = re.compile(r"\{x: ([-\d.eE]+), y: ([-\d.eE]+), z: ([-\d.eE]+), w: ([-\d.eE]+)\}")
FILE_ID = re.compile(r"\{fileID: (-?\d+)\}")

motor_meta = ROOT / "Assets/Scripts/Part Management/Motor.cs.meta"
if motor_meta.exists():
    m = re.search(r"^guid: ([a-f0-9]+)", motor_meta.read_text(), re.M)
    if m:
        MOTOR = m.group(1)

HOLE_TYPES = {0: "normal", 1: "threaded", 2: "clamp"}
SQUARE_SIZE = 0.25


def parse_prefab(path: Path):
    text = path.read_text(errors="replace")
    matches = list(DOC_SPLIT.finditer(text))
    docs = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        docs.append({"class_id": int(m.group(1)), "file_id": m.group(2), "body": text[m.end() : end]})
    return docs


def field(body: str, key: str):
    m = re.search(rf"^\s*{re.escape(key)}: (.*)$", body, re.M)
    if not m:
        return None
    value = m.group(1).strip()
    return value if value else None


def script_guid(body: str):
    m = re.search(r"m_Script: \{fileID: 11500000, guid: ([a-f0-9]+)", body)
    return m.group(1) if m else None


def gameobject_id(body: str):
    m = re.search(r"m_GameObject: \{fileID: (-?\d+)\}", body)
    return m.group(1) if m else None


def parse_vec3(text: str | None):
    if not text:
        return None
    m = VEC3.search(text)
    if not m:
        return None
    return [float(m.group(1)), float(m.group(2)), float(m.group(3))]


def parse_quat(text: str | None):
    if not text:
        return None
    m = VEC4.search(text)
    if not m:
        return None
    return [float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4))]


def file_id_value(text: str | None):
    if not text:
        return None
    m = FILE_ID.search(text)
    return m.group(1) if m else None


class PrefabIndex:
    def __init__(self, docs):
        self.docs = docs
        self.by_id = {d["file_id"]: d for d in docs}
        self.go_name = {}
        self.components_by_go = defaultdict(list)
        self.transform_of_go = {}
        self.go_of_transform = {}
        self.father = {}
        self.children = defaultdict(list)

        for d in docs:
            gid = gameobject_id(d["body"])
            if d["class_id"] == 1:
                self.go_name[d["file_id"]] = field(d["body"], "m_Name") or ""
            if gid:
                self.components_by_go[gid].append(d)
            if d["class_id"] == 4:
                go = gid
                if go:
                    self.transform_of_go[go] = d["file_id"]
                    self.go_of_transform[d["file_id"]] = go
                father = file_id_value(field(d["body"], "m_Father"))
                self.father[d["file_id"]] = father
                if father and father != "0":
                    self.children[father].append(d["file_id"])

    def root_go(self):
        for d in self.docs:
            if d["class_id"] == 4 and re.search(r"m_Father: \{fileID: 0\}", d["body"]):
                return gameobject_id(d["body"])
        return None

    def local_trs(self, transform_id: str):
        body = self.by_id[transform_id]["body"]
        return {
            "position": parse_vec3(field(body, "m_LocalPosition")) or [0, 0, 0],
            "rotation": parse_quat(field(body, "m_LocalRotation")) or [0, 0, 0, 1],
            "scale": parse_vec3(field(body, "m_LocalScale")) or [1, 1, 1],
        }

    def ancestors(self, transform_id: str):
        chain = [transform_id]
        cur = transform_id
        while True:
            parent = self.father.get(cur)
            if not parent or parent == "0":
                break
            chain.append(parent)
            cur = parent
        return chain

    def local_to(self, transform_id: str, ancestor_transform_id: str):
        """Compose local TRS from transform up to (not including) ancestor, result in ancestor space."""
        from math import sqrt

        def qmul(a, b):
            ax, ay, az, aw = a
            bx, by, bz, bw = b
            return [
                aw * bx + ax * bw + ay * bz - az * by,
                aw * by - ax * bz + ay * bw + az * bx,
                aw * bz + ax * by - ay * bx + az * bw,
                aw * bw - ax * bx - ay * by - az * bz,
            ]

        def qrot(q, v):
            x, y, z = v
            qx, qy, qz, qw = q
            tx = 2 * (qy * z - qz * y)
            ty = 2 * (qz * x - qx * z)
            tz = 2 * (qx * y - qy * x)
            return [
                x + qw * tx + (qy * tz - qz * ty),
                y + qw * ty + (qz * tx - qx * tz),
                z + qw * tz + (qx * ty - qy * tx),
            ]

        pos = [0.0, 0.0, 0.0]
        rot = [0.0, 0.0, 0.0, 1.0]
        scale = [1.0, 1.0, 1.0]
        chain = []
        cur = transform_id
        while cur and cur != ancestor_transform_id:
            chain.append(cur)
            cur = self.father.get(cur)
            if not cur or cur == "0":
                break
        for tid in reversed(chain):
            trs = self.local_trs(tid)
            lp = [trs["position"][i] * scale[i] for i in range(3)]
            world_lp = qrot(rot, lp)
            pos = [pos[i] + world_lp[i] for i in range(3)]
            rot = qmul(rot, trs["rotation"])
            scale = [scale[i] * trs["scale"][i] for i in range(3)]
        n = sqrt(sum(c * c for c in rot)) or 1
        rot = [c / n for c in rot]
        return pos, rot, scale


def hole_from_component(index: PrefabIndex, hole_doc, ancestor_transform: str):
    go = gameobject_id(hole_doc["body"])
    transform_id = index.transform_of_go.get(go)
    if not transform_id:
        return None
    pos, rot, scale = index.local_to(transform_id, ancestor_transform)
    hole_type = int(field(hole_doc["body"], "holeType") or 0)
    two_sided = field(hole_doc["body"], "twoSided") == "1"
    size = [abs(scale[0]), abs(scale[1])]
    depth = abs(scale[2])
    shape = "square" if abs(size[0] - SQUARE_SIZE) < 1e-4 and abs(size[1] - SQUARE_SIZE) < 1e-4 else "circle"
    return {
        "position": [round(c, 6) for c in pos],
        "rotation": [round(c, 6) for c in rot],
        "size": [round(c, 6) for c in size],
        "depth": round(depth, 6),
        "type": HOLE_TYPES.get(hole_type, "normal"),
        "twoSided": two_sided,
        "shape": shape,
    }


def holes_under_go(index: PrefabIndex, go_id: str):
    ancestor = index.transform_of_go.get(go_id)
    if not ancestor:
        return []
    holes = []
    for gid, comps in index.components_by_go.items():
        hole_doc = next((c for c in comps if c["class_id"] == 114 and script_guid(c["body"]) == HOLE_COL), None)
        if not hole_doc:
            continue
        transform_id = index.transform_of_go.get(gid)
        if not transform_id:
            continue
        chain = index.ancestors(transform_id)
        if ancestor not in chain and transform_id != ancestor:
            continue
        hole = hole_from_component(index, hole_doc, ancestor)
        if hole:
            holes.append(hole)
    return holes


def collect_weights(index: PrefabIndex):
    weights = []
    for gid, comps in index.components_by_go.items():
        name_doc = next((c for c in comps if c["class_id"] == 114 and script_guid(c["body"]) == PART_NAME), None)
        if not name_doc:
            continue
        pdata = next((c for c in comps if c["class_id"] == 114 and script_guid(c["body"]) == PART_DATA), None)
        grams = float(field(name_doc["body"], "weightInGrams") or 0)
        label = field(name_doc["body"], "name") or index.go_name.get(gid, "")
        entry = {
            "grams": grams,
            "name": label,
            "param1": field(pdata["body"], "param1Value") if pdata else "",
            "param2": field(pdata["body"], "param2Value") if pdata else "",
        }
        weights.append(entry)
    return weights


def primary_depth(index: PrefabIndex, pdata_doc) -> float | None:
    if not pdata_doc:
        return None
    hole_file = file_id_value(field(pdata_doc["body"], "primaryHole"))
    if not hole_file or hole_file == "0":
        return None
    hole_doc = index.by_id.get(hole_file)
    if not hole_doc:
        return None
    go = gameobject_id(hole_doc["body"])
    transform_id = index.transform_of_go.get(go)
    if not transform_id:
        return None
    scale = index.local_trs(transform_id)["scale"]
    return round(abs(scale[2]), 6)


def allow_inserts(pdata_doc) -> bool:
    if not pdata_doc:
        return False
    return field(pdata_doc["body"], "allowCenterInserts") == "1"


def parse_param_block(body, key):
    m = re.search(
        rf"^\s*{key}:\n"
        r"\s+name: (.*)\n"
        r"\s+value: (.*)\n"
        r"\s+custom: (\d)\n"
        r"\s+customUnit: (.*)\n"
        r"\s+customDefault: (.*)\n"
        r"\s+customLimits: \{x: ([-\d.]+), y: ([-\d.]+)\}",
        body,
        re.M,
    )
    if not m:
        return None
    name = m.group(1).strip()
    if not name:
        return None
    return {
        "name": name,
        "defaultValue": m.group(2).strip() or m.group(5).strip(),
        "custom": m.group(3) == "1",
    }


holes_catalog = {}
weights_catalog = {}
meta_catalog = {}

for prefab in sorted(PREFABS.rglob("*.prefab")):
    index = PrefabIndex(parse_prefab(prefab))
    root = index.root_go()
    if not root:
        continue

    part_type = None
    generator = None
    generator_kind = None
    for d in index.components_by_go.get(root, []):
        if d["class_id"] != 114:
            continue
        sg = script_guid(d["body"])
        if sg == PART_TYPE:
            part_type = d
        elif sg in GEN:
            generator = d
            generator_kind = GEN[sg]
    if not part_type:
        continue

    pid = field(part_type["body"], "id") or prefab.stem
    group = FOLDER_GROUP.get(prefab.relative_to(PREFABS).parts[0], "Structure")
    catalog_key = f"{group}:{pid}"

    aluminum = {}
    variants = {}
    plate = None
    shaft = None
    single = None
    primary = None
    inserts = False
    motor_holes = []

    if generator_kind == "aluminum":
        param1 = parse_param_block(generator["body"], "param1") if generator else None
        options = []
        if generator:
            m = re.search(r"^\s*param1Options:\n((?:\s+- .*\n)*)", generator["body"], re.M)
            if m:
                options = [re.sub(r"^\s+- ", "", line) for line in m.group(1).splitlines() if line.strip().startswith("- ")]
        sub_docs = [d for d in index.docs if d["class_id"] == 114 and script_guid(d["body"]) == ALUMINUM_SUB]
        for i, sub in enumerate(sub_docs):
            sub_go = gameobject_id(sub["body"])
            sub_name = index.go_name.get(sub_go or "", "")
            label = next((option for option in options if sub_name.startswith(option)), None)
            if label is None:
                label = options[i] if i < len(options) else str(i)
            roles = {}
            for role in ("start", "mid", "mid5Start", "mid5End", "end"):
                fid = file_id_value(field(sub["body"], role))
                go = fid if fid in index.go_name else index.go_of_transform.get(fid or "")
                if not go:
                    continue
                roles[role] = holes_under_go(index, go)
            aluminum[label] = roles

    elif generator_kind == "plate":
        hole_file = file_id_value(field(generator["body"], "plateHole")) if generator else None
        if hole_file and hole_file in index.by_id:
            hole_doc = index.by_id[hole_file]
            if hole_doc["class_id"] != 114:
                hole_doc = next(
                    (c for c in index.components_by_go.get(gameobject_id(hole_doc["body"]) or "", []) if script_guid(c["body"]) == HOLE_COL),
                    hole_doc,
                )
            go = gameobject_id(hole_doc["body"])
            ancestor = index.transform_of_go.get(go)
            # plate hole local is already the template; keep its own local TRS
            if ancestor:
                father = index.father.get(ancestor)
                hole = hole_from_component(index, hole_doc, father or ancestor)
                plate = hole

    elif generator_kind == "child":
        for gid, comps in index.components_by_go.items():
            pdata = next((c for c in comps if c["class_id"] == 114 and script_guid(c["body"]) == PART_DATA), None)
            if not pdata:
                continue
            p1 = field(pdata["body"], "param1Value") or ""
            p2 = field(pdata["body"], "param2Value") or ""
            variants[f"{p1}|{p2}"] = {
                "holes": holes_under_go(index, gid),
                "primaryHoleDepth": primary_depth(index, pdata),
                "allowCenterInserts": allow_inserts(pdata),
            }

    elif generator_kind == "shaft":
        shaft = {"holes": holes_under_go(index, root)}

    else:
        single = {"holes": holes_under_go(index, root)}
        root_pdata = next(
            (c for c in index.components_by_go.get(root, []) if c["class_id"] == 114 and script_guid(c["body"]) == PART_DATA),
            None,
        )
        primary = primary_depth(index, root_pdata)
        inserts = allow_inserts(root_pdata)

    if MOTOR:
        for gid, comps in index.components_by_go.items():
            motor_doc = next((c for c in comps if c["class_id"] == 114 and script_guid(c["body"]) == MOTOR), None)
            if not motor_doc:
                continue
            hole_file = file_id_value(field(motor_doc["body"], "shaftHole"))
            if not hole_file:
                continue
            hole_doc = index.by_id.get(hole_file)
            if not hole_doc:
                continue
            ancestor = index.transform_of_go.get(gid) or index.transform_of_go.get(root)
            hole = hole_from_component(index, hole_doc, ancestor)
            if hole:
                motor_holes.append(hole)

    holes_catalog[catalog_key] = {
        "id": pid,
        "group": group,
        "generator": generator_kind or "single",
        "aluminum": aluminum or None,
        "plate": plate,
        "variants": variants or None,
        "shaft": shaft,
        "single": single,
        "primaryHoleDepth": primary,
        "allowCenterInserts": inserts,
        "motorHoles": motor_holes or None,
    }

    weights = collect_weights(index)
    if weights:
        weights_catalog[catalog_key] = weights


def write_ts(path: Path, name: str, data):
    path.write_text(f"export const {name} = {json.dumps(data, indent=2)}\n")


write_ts(OUT / "holesCatalog.ts", "HOLES_CATALOG", holes_catalog)
write_ts(OUT / "weightsCatalog.ts", "WEIGHTS_CATALOG", weights_catalog)

print("parts with holes", len(holes_catalog))
print("parts with weights", len(weights_catalog))
for key, data in holes_catalog.items():
    n = 0
    if data["aluminum"]:
        n = sum(len(hs) for roles in data["aluminum"].values() for hs in roles.values())
    elif data["variants"]:
        n = sum(len(v["holes"]) for v in data["variants"].values())
    elif data["plate"]:
        n = 1
    elif data["shaft"]:
        n = len(data["shaft"]["holes"])
    elif data["single"]:
        n = len(data["single"]["holes"])
    print(f"  {key:24} {data['generator']:9} holes~{n}")
