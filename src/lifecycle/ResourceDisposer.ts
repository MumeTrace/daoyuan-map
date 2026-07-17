import * as THREE from 'three';

type DisposableMaterial = THREE.Material & {
  dispose: () => void;
  map?: THREE.Texture | null;
  emissiveMap?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  aoMap?: THREE.Texture | null;
  userData: {
    disposableTextures?: THREE.Texture[];
  };
};

export class ResourceDisposer {
  private readonly cleanupCallbacks: Array<() => void> = [];

  /** 记录需要在关闭地图时执行的清理函数。 */
  add(cleanup: () => void): void {
    this.cleanupCallbacks.push(cleanup);
  }

  /** 统一释放 DOM 监听、Three.js 对象和其他运行时资源。 */
  dispose(): void {
    while (this.cleanupCallbacks.length > 0) {
      const cleanup = this.cleanupCallbacks.pop();
      cleanup?.();
    }
  }

  /** 递归释放场景树中的几何体和材质。 */
  disposeObject3D(root: THREE.Object3D): void {
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    const disposedMaterials = new Set<DisposableMaterial>();

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.userData.skipResourceDisposal) {
        return;
      }
      if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
        disposedGeometries.add(mesh.geometry);
        mesh.geometry.dispose();
      }

      const material = mesh.material as DisposableMaterial | DisposableMaterial[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((item) => {
          if (!disposedMaterials.has(item)) {
            disposedMaterials.add(item);
            this.disposeMaterial(item);
          }
        });
        return;
      }

      if (material && !disposedMaterials.has(material)) {
        disposedMaterials.add(material);
        this.disposeMaterial(material);
      }
    });
  }

  private disposeMaterial(material: DisposableMaterial): void {
    const textures = new Set<THREE.Texture>();
    if (material.map) textures.add(material.map);
    if (material.emissiveMap) textures.add(material.emissiveMap);
    if (material.normalMap) textures.add(material.normalMap);
    if (material.roughnessMap) textures.add(material.roughnessMap);
    if (material.aoMap) textures.add(material.aoMap);
    material.userData.disposableTextures?.forEach((texture) => textures.add(texture));
    textures.forEach((texture) => texture.dispose());
    material.userData.disposableTextures = undefined;
    material.dispose();
  }
}
