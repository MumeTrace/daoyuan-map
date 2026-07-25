import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetManager } from '../assets/AssetManager';
import { MapDebugController } from '../debug/MapDebugController';
import { VEGETATION_CONFIG } from '../data/biomeConfig';
import { RENDER_CONFIG, RENDER_QUALITY_CONFIG, TERRAIN_CONFIG, TERRAIN_TEXTURE_CONFIG } from '../data/mapConfig';
import { getHostWindow } from '../host/hostDom';
import { ResourceDisposer } from '../lifecycle/ResourceDisposer';
import { WorldBuilder } from '../world/WorldBuilder';

export class MapApplication {
  private readonly disposer = new ResourceDisposer();
  private worldBuilder: WorldBuilder | null = null;
  private assetManager: AssetManager | null = null;
  private container: HTMLElement | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private debugController: MapDebugController | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private lastRenderDebugKey = '';
  private lastVegetationLodKey = '';
  private rendererInfoLogged = false;
  private isDisposed = false;

  /** 初始化 Three.js 场景和 Phase 2 程序化三维地形。 */
  mount(container: HTMLElement, status: HTMLElement): void {
    this.container = container;

    try {
      this.scene = this.createScene();
      this.camera = this.createCamera(container);
      this.renderer = this.createRenderer(container);
      this.assetManager = new AssetManager({ renderer: this.renderer });
      this.worldBuilder = new WorldBuilder(this.assetManager);
      this.controls = this.createControls(this.camera, this.renderer.domElement);
      const world = this.worldBuilder.build();
      this.scene.add(world.root);

      container.append(this.renderer.domElement);
      this.debugController = new MapDebugController({
        container,
        scene: this.scene,
        root: world.root,
        sampler: world.sampler,
        terrainStats: world.stats,
        assetManager: this.assetManager,
      });
      this.debugController.mount();
      this.installResizeObserver(container);
      this.resize();
      this.startAnimationLoop();
      status.dataset.kind = 'info';
      status.textContent = '地形尺度已扩容：世界宽深 2160，山体垂直比例 1.35。';
      getHostWindow().setTimeout(() => {
        if (status.dataset.kind !== 'error') {
          status.dataset.kind = 'hidden';
        }
      }, 2200);
    } catch (error) {
      status.dataset.kind = 'error';
      status.textContent = `地图加载失败：${error instanceof Error ? error.message : String(error)}`;
      this.dispose();
    }
  }

  /** 停止动画循环并释放 Three.js 与 DOM 资源。 */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.controls?.dispose();
    this.controls = null;
    this.debugController?.dispose();
    this.debugController = null;
    this.worldBuilder?.dispose();
    this.worldBuilder = null;

    if (this.scene) {
      this.disposer.disposeObject3D(this.scene);
    }

    this.assetManager?.dispose();
    this.assetManager = null;
    this.disposer.dispose();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.container = null;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101926);
    scene.fog = new THREE.Fog(0x101926, TERRAIN_CONFIG.mapSize * 1.7, TERRAIN_CONFIG.mapSize * 3.8);

    const quality = RENDER_QUALITY_CONFIG.levels[RENDER_QUALITY_CONFIG.default];
    const hemisphereLight = new THREE.HemisphereLight(0xd8ebff, 0x3a2b22, 1.52);
    const ambientLight = new THREE.AmbientLight(0xa8b1bd, 0.36);
    const sunLight = new THREE.DirectionalLight(0xffdda3, 2.75);
    const worldScaleFactor = TERRAIN_CONFIG.worldScale / 1.5;
    const shadowExtent = TERRAIN_CONFIG.mapSize * 0.76;
    sunLight.position.set(260 * worldScaleFactor, 360 * worldScaleFactor, 170 * worldScaleFactor);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = TERRAIN_CONFIG.mapSize * 1.72;
    sunLight.shadow.camera.left = -shadowExtent;
    sunLight.shadow.camera.right = shadowExtent;
    sunLight.shadow.camera.top = shadowExtent;
    sunLight.shadow.camera.bottom = -shadowExtent;
    sunLight.shadow.bias = -0.00008;
    sunLight.shadow.normalBias = 0.018;

    scene.add(hemisphereLight, ambientLight, sunLight);
    return scene;
  }

  private createCamera(container: HTMLElement): THREE.PerspectiveCamera {
    const aspect = this.getAspect(container);
    const camera = new THREE.PerspectiveCamera(
      RENDER_CONFIG.cameraFov,
      aspect,
      RENDER_CONFIG.cameraNear,
      RENDER_CONFIG.cameraFar,
    );
    const { x, y, z } = RENDER_CONFIG.initialCameraPosition;
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(container: HTMLElement): THREE.WebGLRenderer {
    const hostWindow = getHostWindow();
    const quality = RENDER_QUALITY_CONFIG.levels[RENDER_QUALITY_CONFIG.default];
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(hostWindow.devicePixelRatio || 1, quality.maxDevicePixelRatio));
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = quality.toneMappingExposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    return renderer;
  }

  private createControls(camera: THREE.PerspectiveCamera, element: HTMLElement): OrbitControls {
    const controls = new OrbitControls(camera, element);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = RENDER_CONFIG.controlsMinDistance;
    controls.maxDistance = RENDER_CONFIG.controlsMaxDistance;
    controls.maxPolarAngle = RENDER_CONFIG.controlsMaxPolarAngle;
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  private installResizeObserver(container: HTMLElement): void {
    const hostWindow = getHostWindow();
    const Observer = (hostWindow as Window & typeof globalThis).ResizeObserver ?? ResizeObserver;
    const resizeObserver = new Observer(() => this.resize());
    resizeObserver.observe(container);
    this.resizeObserver = resizeObserver;
  }

  private resize(): void {
    if (!this.container || !this.camera || !this.renderer) {
      return;
    }

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.logRenderClarity(width, height);
  }

  private logRenderClarity(cssWidth: number, cssHeight: number): void {
    if (!this.renderer) {
      return;
    }

    const drawingBuffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const hostWindow = getHostWindow();
    const key = `${cssWidth}x${cssHeight}:${drawingBuffer.x}x${drawingBuffer.y}:${this.renderer.getPixelRatio()}`;
    if (key === this.lastRenderDebugKey) {
      return;
    }

    this.lastRenderDebugKey = key;
    console.info('[玄天界渲染清晰度]', {
      quality: RENDER_QUALITY_CONFIG.default,
      cssSize: `${cssWidth}x${cssHeight}`,
      drawingBufferSize: `${drawingBuffer.x}x${drawingBuffer.y}`,
      devicePixelRatio: hostWindow.devicePixelRatio || 1,
      rendererPixelRatio: this.renderer.getPixelRatio(),
      outputColorSpace: this.renderer.outputColorSpace,
      toneMapping: this.renderer.toneMapping,
      toneMappingExposure: this.renderer.toneMappingExposure,
      shadowMapType: this.renderer.shadowMap.type,
      maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
      terrainTextureQuality: TERRAIN_TEXTURE_CONFIG.defaultQuality,
      terrainTextureResolution: TERRAIN_TEXTURE_CONFIG.levels[TERRAIN_TEXTURE_CONFIG.defaultQuality],
    });
  }

  private startAnimationLoop(): void {
    const animate = () => {
      if (this.isDisposed || !this.renderer || !this.scene || !this.camera) {
        return;
      }

      this.controls?.update();
      this.updateVegetationVisibility();
      this.debugController?.update();
      this.updateAnimatedObjects(performance.now() * 0.001);
      this.renderer.render(this.scene, this.camera);
      this.logRendererInfoOnce();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private getAspect(container: HTMLElement): number {
    return Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
  }

  private updateAnimatedObjects(elapsedSeconds: number): void {
    this.scene?.traverse((object) => {
      const update = object.userData.update as ((elapsedSeconds: number) => void) | undefined;
      update?.(elapsedSeconds);
    });
  }

  private updateVegetationVisibility(): void {
    if (!this.scene || !this.camera) {
      return;
    }

    const quality = VEGETATION_CONFIG.lod[VEGETATION_CONFIG.defaultQuality];
    const target = this.controls?.target ?? new THREE.Vector3();
    const distance = this.camera.position.distanceTo(target);
    const showDetail = distance <= quality.detailMaxDistance;
    const showMid = distance <= quality.midMaxDistance;
    const key = `${showDetail}:${showMid}`;
    if (key === this.lastVegetationLodKey) {
      return;
    }
    this.lastVegetationLodKey = key;

    const vegetation = this.scene.getObjectByName('风格化树木实例层');
    vegetation?.traverse((object) => {
      if (object.userData.lodRole === 'detail') {
        object.visible = showDetail;
      }
      if (object.userData.lodRole === 'mid') {
        object.visible = showMid;
      }
    });
  }

  private logRendererInfoOnce(): void {
    if (this.rendererInfoLogged || !this.renderer) {
      return;
    }
    this.rendererInfoLogged = true;
    console.info('[玄天界 renderer.info]', {
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      points: this.renderer.info.render.points,
      lines: this.renderer.info.render.lines,
    });
  }
}
