#!/usr/bin/env python3
from pathlib import Path
import re, shutil

ROOT = Path("/home/pingu/Work/contrib/Protobot-Rebuilt")
PREFABS = ROOT / "Assets/Resources/Part Prefabs"
MODELS = ROOT / "Assets/Models"
SPRITES = ROOT / "Assets/Sprites"
OUT_WEB = Path("/home/pingu/Work/r3f/wotobot")

PART_TYPE = "20517603e29e5ac47a06559006a99763"
PART_DATA = "eef8f5de2cc508f409ba021e27e5a351"
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
UNITY_GROUP = {0: "Structure", 1: "Motion", 2: "Electronics", 3: "None"}
ALUMINUM_FBX = {
    "CCHL": {"catalog": None, "split": "Structure/C-Channels (split).fbx", "meshPrefix": "CCHL"},
    "ANGL": {"catalog": "Structure/Angles.fbx", "split": "Structure/Angles (split).fbx", "meshPrefix": "ANGL"},
    "UCHL": {"catalog": None, "split": "Structure/U-Channels (split).fbx", "meshPrefix": "UCHL"},
    "RAILS": {"catalog": "Extra Structure/Rails.fbx", "split": None, "meshPrefix": "RAIL"},
}

guid_to_fbx = {}
for meta in MODELS.rglob("*.fbx.meta"):
    text = meta.read_text(errors="replace")
    m = re.search(r"^guid: ([a-f0-9]+)", text, re.M)
    if m:
        guid_to_fbx[m.group(1)] = meta.with_suffix("").relative_to(MODELS).as_posix()

guid_to_icon = {}
for meta in SPRITES.rglob("*.png.meta"):
    text = meta.read_text(errors="replace")
    m = re.search(r"^guid: ([a-f0-9]+)", text, re.M)
    if m:
        guid_to_icon[m.group(1)] = meta.with_suffix("")

DOC_SPLIT = re.compile(r"^--- !u!(\d+) &(-?\d+)", re.M)


def parse_prefab(path: Path):
    text = path.read_text(errors="replace")
    matches = list(DOC_SPLIT.finditer(text))
    docs = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        docs.append({"class_id": int(m.group(1)), "file_id": m.group(2), "body": text[m.end() : end]})
    return docs


def field(body, key):
    m = re.search(rf"^\s*{re.escape(key)}: (.*)$", body, re.M)
    if not m:
        return None
    value = m.group(1).strip()
    return value if value else None


def script_guid(body):
    m = re.search(r"m_Script: \{fileID: 11500000, guid: ([a-f0-9]+)", body)
    return m.group(1) if m else None


def mesh_ref(body):
    m = re.search(r"m_Mesh: \{fileID: (-?\d+), guid: ([a-f0-9]+)", body)
    return (m.group(1), m.group(2)) if m else (None, None)


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
    custom = m.group(3) == "1"
    default = m.group(2).strip()
    custom_default = m.group(5).strip()
    return {
        "name": name,
        "defaultValue": default or custom_default,
        "custom": custom,
        "unit": m.group(4).strip(),
        "customDefault": custom_default,
        "min": float(m.group(6)),
        "max": float(m.group(7)),
        "options": [],
    }


def parse_string_list(body, key):
    m = re.search(rf"^\s*{key}:\n((?:\s+- .*\n)*)", body, re.M)
    if not m:
        return []
    return [re.sub(r"^\s+- ", "", line) for line in m.group(1).splitlines() if line.strip().startswith("- ")]


def gameobject_id(body):
    m = re.search(r"m_GameObject: \{fileID: (-?\d+)\}", body)
    return m.group(1) if m else None


catalog = []
icon_copies = []

for prefab in sorted(PREFABS.rglob("*.prefab")):
    group = FOLDER_GROUP.get(prefab.relative_to(PREFABS).parts[0], "Structure")
    docs = parse_prefab(prefab)
    by_id = {d["file_id"]: d for d in docs}
    go_by_id = {}
    components_by_go = {}

    for d in docs:
        if d["class_id"] == 1:
            go_by_id[d["file_id"]] = field(d["body"], "m_Name") or ""
        gid = gameobject_id(d["body"])
        if gid:
            components_by_go.setdefault(gid, []).append(d)

    root_go = None
    for d in docs:
        if d["class_id"] == 4 and re.search(r"m_Father: \{fileID: 0\}", d["body"]):
            root_go = gameobject_id(d["body"])
            break
    if not root_go:
        continue

    part_type = None
    generator = None
    generator_kind = None
    for d in components_by_go.get(root_go, []):
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

    name = go_by_id.get(root_go) or prefab.stem
    pid = field(part_type["body"], "id") or prefab.stem
    connecting = field(part_type["body"], "connectingPart") == "1"
    unity_group_n = int(field(part_type["body"], "group") or 0)
    icon_guid_m = re.search(r"icon: \{fileID: \d+, guid: ([a-f0-9]+)", part_type["body"])
    icon_file = guid_to_icon.get(icon_guid_m.group(1)) if icon_guid_m else None

    param1 = parse_param_block(generator["body"], "param1") if generator else None
    param2 = parse_param_block(generator["body"], "param2") if generator else None
    if generator_kind == "aluminum" and generator and param1:
        param1["options"] = parse_string_list(generator["body"], "param1Options")
        if not param1["defaultValue"] and param1["options"]:
            param1["defaultValue"] = param1["options"][0]
    if generator_kind == "shaft":
        if param1:
            param1["options"] = ["Normal", "High Strength"]
        if param2:
            param2["custom"] = True
            param2["defaultValue"] = param2["defaultValue"] or param2["customDefault"] or "6"

    variants = []
    if generator_kind == "child":
        for gid, comps in components_by_go.items():
            pdata = next((c for c in comps if c["class_id"] == 114 and script_guid(c["body"]) == PART_DATA), None)
            meshf = next((c for c in comps if c["class_id"] == 33), None)
            if not pdata:
                continue
            fbx = None
            if meshf:
                _, mg = mesh_ref(meshf["body"])
                fbx = guid_to_fbx.get(mg)
            variants.append(
                {
                    "param1": field(pdata["body"], "param1Value") or "",
                    "param2": field(pdata["body"], "param2Value") or "",
                    "meshName": go_by_id.get(gid) or "",
                    "fbx": fbx,
                }
            )
        if param1:
            seen = []
            for v in variants:
                if v["param1"] and v["param1"] not in seen:
                    seen.append(v["param1"])
            param1["options"] = seen
            if not param1["defaultValue"] and seen:
                param1["defaultValue"] = seen[0]
        if param2:
            if any(v["param2"] for v in variants):
                seen = []
                for v in variants:
                    if v["param2"] and v["param2"] not in seen:
                        seen.append(v["param2"])
                param2["options"] = seen
                if not param2["defaultValue"] and seen:
                    param2["defaultValue"] = seen[0]
            else:
                param2 = None

    single_mesh = None
    if generator_kind == "single" and generator:
        m = re.search(r"singleObj: \{fileID: (-?\d+)\}", generator["body"])
        target = None
        if m:
            tid = m.group(1)
            target = tid if tid in go_by_id else gameobject_id(by_id.get(tid, {}).get("body", ""))
        if target:
            meshf = next((c for c in components_by_go.get(target, []) if c["class_id"] == 33), None)
            if meshf:
                _, mg = mesh_ref(meshf["body"])
                single_mesh = {"meshName": go_by_id.get(target) or name, "fbx": guid_to_fbx.get(mg)}
        if not single_mesh:
            for gid, comps in components_by_go.items():
                meshf = next((c for c in comps if c["class_id"] == 33), None)
                if not meshf:
                    continue
                _, mg = mesh_ref(meshf["body"])
                fbx = guid_to_fbx.get(mg)
                if fbx:
                    single_mesh = {"meshName": go_by_id.get(gid) or name, "fbx": fbx}
                    break

    if generator_kind == "plate":
        meshf = next((c for c in docs if c["class_id"] == 33), None)
        if meshf:
            _, mg = mesh_ref(meshf["body"])
            single_mesh = {"meshName": "1x1 Plate", "fbx": guid_to_fbx.get(mg)}

    if generator_kind == "shaft":
        variants = []
        shaft_mesh_names = {
            "Normal": "SHFT_1in",
            "High Strength": "HSFT_1in",
        }
        for label, field_name in (("Normal", "normalShaftInch"), ("High Strength", "hsShaftInch")):
            m = re.search(rf"{field_name}: \{{fileID: (-?\d+)\}}", generator["body"])
            if not m:
                continue
            tid = m.group(1)
            target = tid if tid in go_by_id else gameobject_id(by_id.get(tid, {}).get("body", ""))
            meshf = next((c for c in components_by_go.get(target or "", []) if c["class_id"] == 33), None)
            fbx = None
            mesh_name = shaft_mesh_names[label]
            if meshf:
                _, mg = mesh_ref(meshf["body"])
                fbx = guid_to_fbx.get(mg)
            variants.append({"param1": label, "param2": "", "meshName": mesh_name, "fbx": fbx})

    if generator_kind == "aluminum":
        info = ALUMINUM_FBX.get(pid, {})
        single_mesh = {
            "meshName": info.get("meshPrefix") or pid,
            "fbx": info.get("catalog") or info.get("split"),
            "splitFbx": info.get("split"),
        }

    icon_url = None
    if icon_file:
        safe = f"{pid}.png"
        icon_url = f"/part-icons/{safe}"
        icon_copies.append((icon_file, safe))

    catalog.append(
        {
            "id": pid,
            "name": name,
            "group": group,
            "unityGroup": UNITY_GROUP.get(unity_group_n, "Structure"),
            "connectingPart": connecting,
            "generator": generator_kind or "single",
            "icon": icon_url,
            "param1": param1,
            "param2": param2,
            "variants": variants,
            "mesh": single_mesh,
        }
    )

icon_dir = OUT_WEB / "public/part-icons"
if icon_dir.exists():
    shutil.rmtree(icon_dir)
icon_dir.mkdir(parents=True)
for src, dest in icon_copies:
    if src.exists():
        shutil.copy2(src, icon_dir / dest)

groups = ["Structure", "Motion", "Electronics", "Pneumatics", "Competition"]
catalog.sort(key=lambda p: (groups.index(p["group"]) if p["group"] in groups else 99, p["name"]))

print("parts", len(catalog), "icons", len(list(icon_dir.glob("*.png"))))
for p in catalog:
    p1 = (p["param1"] or {}).get("name")
    print(f"{p['id']:8} {p['name']:22} {p['generator']:9} {p['group']:12} p1={p1} nvar={len(p['variants'])} icon={bool(p['icon'])}")
