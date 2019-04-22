import { AframeRegistryEntry } from "../../interfaces";
import { VolumetricLoader } from "../../utils/VolumetricLoader";
import { Constants } from "../../Constants";
import { DisplayMode } from "../../enums";
import { ComponentDefinition } from "aframe";

interface AlVolumeState {
  stack: any;
  stackhelper: AMI.StackHelper | AMI.VolumeRenderHelper;
  lutHelper: AMI.LutHelper;
}

interface AlVolumeDefinition extends ComponentDefinition {
  tickFunction(): void;
  handleStack(stack: any): void;
  bindMethods(): void;
}

export class AlVolumeComponent implements AframeRegistryEntry {
  public static get Object(): AlVolumeDefinition {
    return {
      schema: {
        srcLoaded: { type: "boolean" },
        src: { type: "string" },
        displayMode: { type: "string" },
        slicesIndex: { type: "number" },
        slicesOrientation: { type: "string" },
        slicesWindowWidth: { type: "number" },
        slicesWindowCenter: { type: "number" },
        volumeSteps: { type: "number" },
        volumeWindowWidth: { type: "number" },
        volumeWindowCenter: { type: "number" },
        isWebGl2: { type: "boolean" },
        rendererEnabled: { type: "boolean", default: true }
      },

      bindMethods(): void {
        this.handleStack = this.handleStack.bind(this);
      },

      init(): void {
        this.tickFunction = AFRAME.utils.throttle(
          this.tickFunction,
          Constants.minFrameMS,
          this
        );
        this.loader = new VolumetricLoader();
        this.state = {} as AlVolumeState;
        this.bindMethods();
      },

      handleStack(stack: any): void {
        const state = this.state as AlVolumeState;
        const el = this.el;

        state.stack = stack;
        this.renderFunc = el.sceneEl.render;

        switch (this.data.displayMode) {
          case DisplayMode.SLICES: {
            state.stackhelper = new AMI.StackHelper(state.stack);

            state.stackhelper.bbox.visible = false;
            state.stackhelper.border.color = Constants.colorValues.blue;
            break;
          }
          case DisplayMode.VOLUME: {
            // Get LUT Canvas
            const lutCanvases: HTMLElement = el.sceneEl.parentEl.querySelector(
              "#lut-canvases"
            );
            // Create the LUT Helper
            state.lutHelper = new AMI.LutHelper(lutCanvases);
            state.lutHelper.luts = AMI.LutHelper.presetLuts();
            state.lutHelper.lutsO = AMI.LutHelper.presetLutsO();
            state.stackhelper = new AMI.VolumeRenderHelper(state.stack);
            state.stackhelper.textureLUT = state.lutHelper.texture;
            break;
          }
        }

        el.sceneEl.emit(AlVolumeEvents.LOADED, state.stackhelper, false);
      },

      update(oldData): void {
        const state = this.state;
        const el = this.el;

        if (!this.data.src) {
          return;
        } else if (oldData && oldData.src !== this.data.src) {
          this.loader.load(this.data.src, el).then(stack => {
            this.handleStack(stack);
          });
        } else if (
          oldData &&
          oldData.displayMode !== this.data.displayMode &&
          state.stack
        ) {
          this.handleStack(state.stack);
        }

        if (oldData && oldData.rendererEnabled !== this.data.rendererEnabled) {
          if (this.data.rendererEnabled) {
            setTimeout(() => {
              console.log("enable renderer");
              ((this.state as AlVolumeState).stackhelper as AMI.VolumeRenderHelper).isPaused = 0;
            }, Constants.minFrameMS);
          } else {
            setTimeout(() => {
              console.log("disable renderer");
              ((this.state as AlVolumeState).stackhelper as AMI.VolumeRenderHelper).isPaused = 1;
            }, Constants.minFrameMS);
          }
        }
      },

      tickFunction(): void {
        if (this.state.stackhelper) {
          this.el.setObject3D("mesh", this.state.stackhelper);
        }
      },

      tick() {
        this.tickFunction();
      },

      remove(): void {
        this.el.removeObject3D("mesh");
      }
    } as AlVolumeDefinition;
  }

  public static get Tag(): string {
    return "al-volume";
  }
}

export class AlVolumeEvents {
  static LOADED: string = "al-volume-loaded";
  static ERROR: string = "al-volume-error";
}