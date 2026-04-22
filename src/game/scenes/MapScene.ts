import Phaser from 'phaser';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x403c73);
    this.add.text(width / 2, 32, '城市地图', {
      color: '#ffffff',
      fontSize: '22px'
    }).setOrigin(0.5, 0.5);

    const spots = [
      { x: 92, y: 140, label: '学校' },
      { x: 280, y: 170, label: '医院' },
      { x: 130, y: 320, label: '商场' },
      { x: 292, y: 390, label: '主角家' }
    ];

    spots.forEach((spot) => {
      this.add.circle(spot.x, spot.y, 24, 0xf8c4ff, 0.85);
      this.add.text(spot.x, spot.y + 42, spot.label, {
        color: '#ffffff',
        fontSize: '16px'
      }).setOrigin(0.5, 0.5);
    });
  }
}
