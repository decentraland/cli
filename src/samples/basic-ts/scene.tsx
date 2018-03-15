
import { inject, Script, WebWorkerTransport, EntityController } from 'dcl-sdk';

export class MyScript extends Script {
  @inject('EntityController') entities: EntityController | null = null;

  private steps = [
    {
      position: { value: '5 3 5', duration: 750 },
      rotation: { value: '45 0 0', duration: 750 },
      color: { value: 'red', duration: 750 }
    },
    {
      position: { value: '3 3 3', duration: 750 },
      rotation: { value: '45 45 0', duration: 750 },
      color: { value: 'green', duration: 750 }
    },
    {
      position: { value: '3 5 3', duration: 750 },
      rotation: { value: '45 45 45', duration: 750 },
      color: { value: 'blue', duration: 750 }
    },
    {
      position: { value: '5 5 5', duration: 750 },
      rotation: { value: '0 0 0', duration: 750 },
      color: { value: 'yellow', duration: 750 }
    }
  ];

  private currentStep: number = 0;

  async systemDidEnable() {
    setInterval(async () => {
      await this.entities!.tweenTo('interactiveBox', this.steps[this.currentStep]);

      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
      } else {
        this.currentStep = 0;
      }
    }, 1000);
  }
}

export const theSystem = new MyScript(WebWorkerTransport(self as any));
