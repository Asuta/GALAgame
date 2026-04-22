import Phaser from 'phaser';
import { MapScene } from './scenes/MapScene';

let activeGame: Phaser.Game | null = null;

export const createPhaserHost = (parent: string): Phaser.Game => {
  activeGame?.destroy(true);

  activeGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 390,
    height: 620,
    backgroundColor: '#403c73',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MapScene]
  });

  return activeGame;
};
