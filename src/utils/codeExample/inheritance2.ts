// AI GENERATED VIA CHATGPT
// 1. Define an interface
export interface Flyer {
  maximumAltitude: number;
  fly(): void;
}

// 2. Base class
export class Animal {
  protected name: string;

  constructor(name: string) {
    this.name = name;
  }

  public eat(food: string): void {
    console.log(`${this.name} is eating ${food}.`);
  }
}
