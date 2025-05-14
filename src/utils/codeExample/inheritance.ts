import { Animal, Flyer } from "./inheritance2";

// 3. Derived class: extends Animal and implements Flyer
class Eagle extends Animal implements Flyer {
  public maximumAltitude: number;

  constructor(name: string, maxAlt: number) {
    // Call the parent (Animal) constructor
    super(name);
    this.maximumAltitude = maxAlt;
  }

  // Implementing the Flyer interface method
  public fly(): void {
    console.log(
      `${this.name} soars up to ${this.maximumAltitude} meters high!`
    );
  }

  // Override Animal's eat method to add extra behavior
  public eat(food: string): void {
    console.log(`${this.name} snatches ${food} mid-air before eating!`);
    super.eat(food);
  }
}

// 4. Usage
const eagle = new Eagle("Majestic", 3000);
eagle.eat("a fish");
// Majestic snatches a fish mid-air before eating!
// Majestic is eating a fish.

eagle.fly();
// Majestic soars up to 3000 meters high!
