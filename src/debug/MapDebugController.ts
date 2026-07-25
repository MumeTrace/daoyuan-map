import * as THREE from 'three';
import { AssetManager } from '../assets/AssetManager';
import { DEBUG_CONFIG, MOUNTAIN_CONFIG, WORLD_SCALE_CONFIG } from '../data/mapConfig';
import { TerrainSampler } from '../terrain/TerrainSampler';
import { LandmarkFactoryStats } from '../types/landmarks';
import { VegetationStats } from '../types/vegetation';

type DebugControllerOptions = {
  container: HTMLElement;
  scene: THREE.Scene;
  root: THREE.Group;
  sampler: TerrainSampler;
  terrainStats: { minHeight: number; maxHeight: number; vertexCount: number; segments: number; terrainGenerationMs: number };
  assetManager?: AssetManager;
};

type DebugLayer = {
  name: string;
  object: THREE.Object3D | null;
};

export class MapDebugController {
  private readonly options: DebugControllerOptions;
  private panel: HTMLElement | null = null;
  private pathGroup: THREE.Group | null = null;
  private hostDocument: Document | null = null;
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private fps = 0;
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.shiftKey && event.key.toUpperCase() === DEBUG_CONFIG.toggleKey) {
      this.togglePanel();
    }
  };

  constructor(options: DebugControllerOptions) {
    this.options = options;
  }

  /** 安装默认关闭的调试面板和快捷键。 */
  mount(): void {
    this.hostDocument = this.options.container.ownerDocument;
    this.panel = this.hostDocument.createElement('div');
    this.panel.className = 'xuantian-map-debug-panel';
    this.panel.hidden = !DEBUG_CONFIG.enabledByDefault;
    this.panel.innerHTML = this.createPanelHtml();
    this.options.container.append(this.panel);
    this.bindControls();
    this.hostDocument.addEventListener('keydown', this.onKeyDown);
  }

  update(): void {
    this.frameCount += 1;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      const fpsTarget = this.panel?.querySelector('[data-debug-fps]');
      if (fpsTarget) {
        fpsTarget.textContent = String(this.fps);
      }
    }
  }

  dispose(): void {
    this.hostDocument?.removeEventListener('keydown', this.onKeyDown);
    this.disposeDebugPaths();
    this.panel?.remove();
    this.panel = null;
    this.pathGroup = null;
    this.hostDocument = null;
  }

  private createPanelHtml(): string {
    const vegetationStats = this.options.root.getObjectByName('风格化树木实例层')?.userData.vegetationStats as VegetationStats | undefined;
    const landmarkStats = this.options.root.getObjectByName('标志建筑层')?.userData.landmarkStats as LandmarkFactoryStats | undefined;
    const assetProgress = this.options.assetManager?.getProgress();
    return `
      <div class="xuantian-map-debug-title">调试面板 <span>Shift+D</span></div>
      ${this.createCheckbox('terrain', '显示地形', true)}
      ${this.createCheckbox('trees', '显示树木', true)}
      ${this.createCheckbox('buildings', '显示标志建筑', true)}
      ${this.createCheckbox('wireframe', '地形线框', false)}
      ${this.createCheckbox('paths', '显示山脉路径', false)}
      ${this.createCheckbox('boundaries', '显示区域边界', true)}
      ${this.createCheckbox('anchors', '显示地点锚点', false)}
      <div class="xuantian-map-debug-readout">FPS: <b data-debug-fps>0</b></div>
      <div class="xuantian-map-debug-readout">世界: ${WORLD_SCALE_CONFIG.mapWidth} × ${WORLD_SCALE_CONFIG.mapDepth} / scale ${WORLD_SCALE_CONFIG.horizontalScale}</div>
      <div class="xuantian-map-debug-readout">网格: ${this.options.terrainStats.segments} segments / ${this.options.terrainStats.vertexCount} vertices</div>
      <div class="xuantian-map-debug-readout">生成: ${this.options.terrainStats.terrainGenerationMs.toFixed(1)}ms</div>
      <div class="xuantian-map-debug-readout">高度: ${this.options.terrainStats.minHeight.toFixed(1)} ～ ${this.options.terrainStats.maxHeight.toFixed(1)}</div>
      <div class="xuantian-map-debug-readout">山峰: 连续山脊随地形垂直比例缩放；装饰峰仅作地标</div>
      <div class="xuantian-map-debug-readout">植被: ${vegetationStats ? `${this.totalVegetationInstances(vegetationStats)} instances / ${vegetationStats.drawCalls} draws` : '未生成'}</div>
      <div class="xuantian-map-debug-readout">树木: 普通 3～6；灵树 6～9.2；建筑预留 5～20</div>
      <div class="xuantian-map-debug-readout">GLB: ${landmarkStats ? `${landmarkStats.loadedModelCount}/${landmarkStats.requestedModelCount} loaded, fallback ${landmarkStats.fallbackCount}` : '未启用'}</div>
      <div class="xuantian-map-debug-readout">资产: ${assetProgress ? `req ${assetProgress.requested}, fail ${assetProgress.failed}, cache ${assetProgress.cacheHits}` : '无'}</div>
    `;
  }

  private totalVegetationInstances(stats: VegetationStats): number {
    return Object.entries(stats.instanceCounts).reduce((sum, [key, count]) => (key === 'unfilled' ? sum : sum + count), 0);
  }

  private createCheckbox(id: string, label: string, checked: boolean): string {
    return `<label><input type="checkbox" data-debug-toggle="${id}" ${checked ? 'checked' : ''}>${label}</label>`;
  }

  private bindControls(): void {
    this.panel?.querySelectorAll<HTMLInputElement>('[data-debug-toggle]').forEach((input) => {
      input.addEventListener('change', () => this.applyToggle(input.dataset.debugToggle ?? '', input.checked));
    });
  }

  private applyToggle(id: string, checked: boolean): void {
    if (id === 'wireframe') {
      this.setTerrainWireframe(checked);
      return;
    }
    if (id === 'paths') {
      this.toggleMountainPaths(checked);
      return;
    }

    const layers = this.getLayers();
    const layer = layers.find((item) => item.name === id);
    if (layer?.object) {
      layer.object.visible = checked;
    }
  }

  private getLayers(): DebugLayer[] {
    return [
      { name: 'terrain', object: this.options.root.getObjectByName('玄天界程序化地形') ?? null },
      { name: 'trees', object: this.options.root.getObjectByName('风格化树木实例层') ?? null },
      { name: 'buildings', object: this.options.root.getObjectByName('标志建筑层') ?? null },
      { name: 'boundaries', object: this.options.root.getObjectByName('疆域边界') ?? null },
      { name: 'anchors', object: this.options.root.getObjectByName('地点锚点') ?? null },
    ];
  }

  private setTerrainWireframe(enabled: boolean): void {
    const terrain = this.options.root.getObjectByName('玄天界程序化地形') as THREE.Mesh | undefined;
    const material = terrain?.material as THREE.MeshStandardMaterial | undefined;
    if (material) {
      material.wireframe = enabled;
      material.needsUpdate = true;
    }
  }

  private toggleMountainPaths(enabled: boolean): void {
    if (enabled) {
      if (!this.pathGroup) {
        this.pathGroup = this.createMountainPathGroup();
        this.options.scene.add(this.pathGroup);
      }
      this.pathGroup.visible = true;
      return;
    }
    if (this.pathGroup) {
      this.pathGroup.visible = false;
    }
  }

  private createMountainPathGroup(): THREE.Group {
    const group = new THREE.Group();
    group.name = '调试山脉路径';
    const material = new THREE.LineBasicMaterial({ color: 0x55ddff, transparent: true, opacity: 0.9 });
    const paths = [
      MOUNTAIN_CONFIG.endlessMountains.path,
      ...MOUNTAIN_CONFIG.endlessMountains.branches,
      MOUNTAIN_CONFIG.northernSnowfield.path,
      ...MOUNTAIN_CONFIG.northernSnowfield.branches,
      MOUNTAIN_CONFIG.southVolcanicHighland.path,
      ...MOUNTAIN_CONFIG.southVolcanicHighland.branches,
      MOUNTAIN_CONFIG.centralHills.path,
    ];

    paths.forEach((path) => {
      const points = path.map((point) => {
        const position = this.options.sampler.sampleNormalized(point, 4);
        return new THREE.Vector3(position.x, position.y, position.z);
      });
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    });

    return group;
  }

  private disposeDebugPaths(): void {
    if (!this.pathGroup) {
      return;
    }
    this.pathGroup.traverse((object) => {
      const line = object as THREE.Line;
      line.geometry?.dispose();
      const material = line.material as THREE.Material | undefined;
      material?.dispose();
    });
    this.pathGroup.removeFromParent();
  }

  private togglePanel(): void {
    if (this.panel) {
      this.panel.hidden = !this.panel.hidden;
    }
  }
}
