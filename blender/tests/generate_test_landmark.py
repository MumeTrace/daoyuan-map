import json
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "models" / "landmarks" / "test_landmark.glb"


def align4(data: bytes, pad: bytes = b" ") -> bytes:
    return data + pad * ((4 - len(data) % 4) % 4)


def add_box(vertices, indices, min_x, min_y, min_z, max_x, max_y, max_z):
    start = len(vertices)
    faces = [
        ((min_x, min_y, max_z), (max_x, min_y, max_z), (max_x, max_y, max_z), (min_x, max_y, max_z)),
        ((max_x, min_y, min_z), (min_x, min_y, min_z), (min_x, max_y, min_z), (max_x, max_y, min_z)),
        ((min_x, min_y, min_z), (min_x, min_y, max_z), (min_x, max_y, max_z), (min_x, max_y, min_z)),
        ((max_x, min_y, max_z), (max_x, min_y, min_z), (max_x, max_y, min_z), (max_x, max_y, max_z)),
        ((min_x, max_y, max_z), (max_x, max_y, max_z), (max_x, max_y, min_z), (min_x, max_y, min_z)),
        ((min_x, min_y, min_z), (max_x, min_y, min_z), (max_x, min_y, max_z), (min_x, min_y, max_z)),
    ]
    for face in faces:
        vertices.extend(face)
        offset = start
        indices.extend([offset, offset + 1, offset + 2, offset, offset + 2, offset + 3])
        start += 4


def add_pyramid(vertices, indices, radius, base_y, top_y):
    start = len(vertices)
    base = [(-radius, base_y, -radius), (radius, base_y, -radius), (radius, base_y, radius), (-radius, base_y, radius)]
    top = (0, top_y, 0)
    vertices.extend(base + [top])
    indices.extend([
        start, start + 1, start + 4,
        start + 1, start + 2, start + 4,
        start + 2, start + 3, start + 4,
        start + 3, start, start + 4,
        start, start + 3, start + 2,
        start, start + 2, start + 1,
    ])


def build_glb():
    vertices = []
    indices = []
    add_box(vertices, indices, -5.5, 0, -5.5, 5.5, 1.2, 5.5)
    add_box(vertices, indices, -3.5, 1.2, -3.5, 3.5, 7.2, 3.5)
    add_box(vertices, indices, -1.2, 7.2, -1.2, 1.2, 14.5, 1.2)
    add_pyramid(vertices, indices, 4.8, 7.2, 10.2)
    add_pyramid(vertices, indices, 1.8, 14.5, 18.0)

    position_bytes = b"".join(struct.pack("<3f", *item) for item in vertices)
    index_bytes = b"".join(struct.pack("<H", item) for item in indices)
    position_offset = 0
    index_offset = len(position_bytes)
    bin_blob = align4(position_bytes, b"\x00") + align4(index_bytes, b"\x00")
    index_offset = len(align4(position_bytes, b"\x00"))

    gltf = {
        "asset": {"version": "2.0", "generator": "codex-phase-3a-test-landmark"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "test_landmark_root"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "material": 0}]}],
        "materials": [{
            "name": "test_landmark_gold_stone",
            "pbrMetallicRoughness": {
                "baseColorFactor": [0.78, 0.64, 0.36, 1.0],
                "metallicFactor": 0.05,
                "roughnessFactor": 0.62,
            },
        }],
        "buffers": [{"byteLength": len(bin_blob)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": position_offset, "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": index_offset, "byteLength": len(index_bytes), "target": 34963},
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(vertices),
                "type": "VEC3",
                "min": [min(v[i] for v in vertices) for i in range(3)],
                "max": [max(v[i] for v in vertices) for i in range(3)],
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR",
                "min": [min(indices)],
                "max": [max(indices)],
            },
        ],
    }

    json_blob = align4(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    total_length = 12 + 8 + len(json_blob) + 8 + len(bin_blob)
    header = struct.pack("<III", 0x46546C67, 2, total_length)
    json_header = struct.pack("<I4s", len(json_blob), b"JSON")
    bin_header = struct.pack("<I4s", len(bin_blob), b"BIN\x00")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(header + json_header + json_blob + bin_header + bin_blob)
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    build_glb()
