export interface BodyRegion {
  id: string;
  name: string;
  path: string;
  centerX: number;
  centerY: number;
  subRegions?: BodyRegion[];
}

export const bodyRegions: BodyRegion[] = [
  {
    id: 'head',
    name: 'Head',
    path: 'M 100,30 C 80,30 70,40 70,60 C 70,80 80,90 100,90 C 120,90 130,80 130,60 C 130,40 120,30 100,30',
    centerX: 100,
    centerY: 60,
    subRegions: [
      {
        id: 'forehead',
        name: 'Forehead',
        path: 'M 80,40 L 120,40 L 120,50 L 80,50 Z',
        centerX: 100,
        centerY: 45
      },
      {
        id: 'temple',
        name: 'Temple',
        path: 'M 70,50 C 75,50 75,60 70,60',
        centerX: 72,
        centerY: 55
      }
    ]
  },
  {
    id: 'neck',
    name: 'Neck',
    path: 'M 90,90 L 110,90 L 110,110 L 90,110 Z',
    centerX: 100,
    centerY: 100
  },
  {
    id: 'chest',
    name: 'Chest',
    path: 'M 70,110 L 130,110 L 130,160 L 70,160 Z',
    centerX: 100,
    centerY: 135,
    subRegions: [
      {
        id: 'left-chest',
        name: 'Left Chest',
        path: 'M 70,110 L 100,110 L 100,160 L 70,160 Z',
        centerX: 85,
        centerY: 135
      },
      {
        id: 'right-chest',
        name: 'Right Chest',
        path: 'M 100,110 L 130,110 L 130,160 L 100,160 Z',
        centerX: 115,
        centerY: 135
      }
    ]
  },
  {
    id: 'abdomen',
    name: 'Abdomen',
    path: 'M 70,160 L 130,160 L 130,220 L 70,220 Z',
    centerX: 100,
    centerY: 190,
    subRegions: [
      {
        id: 'upper-abdomen',
        name: 'Upper Abdomen',
        path: 'M 70,160 L 130,160 L 130,190 L 70,190 Z',
        centerX: 100,
        centerY: 175
      },
      {
        id: 'lower-abdomen',
        name: 'Lower Abdomen',
        path: 'M 70,190 L 130,190 L 130,220 L 70,220 Z',
        centerX: 100,
        centerY: 205
      }
    ]
  },
  {
    id: 'left-arm',
    name: 'Left Arm',
    path: 'M 40,110 L 70,110 L 70,200 L 40,200 Z',
    centerX: 55,
    centerY: 155,
    subRegions: [
      {
        id: 'left-shoulder',
        name: 'Left Shoulder',
        path: 'M 40,110 L 70,110 L 70,130 L 40,130 Z',
        centerX: 55,
        centerY: 120
      },
      {
        id: 'left-upper-arm',
        name: 'Left Upper Arm',
        path: 'M 40,130 L 70,130 L 70,160 L 40,160 Z',
        centerX: 55,
        centerY: 145
      },
      {
        id: 'left-lower-arm',
        name: 'Left Lower Arm',
        path: 'M 40,160 L 70,160 L 70,200 L 40,200 Z',
        centerX: 55,
        centerY: 180
      }
    ]
  },
  {
    id: 'right-arm',
    name: 'Right Arm',
    path: 'M 130,110 L 160,110 L 160,200 L 130,200 Z',
    centerX: 145,
    centerY: 155,
    subRegions: [
      {
        id: 'right-shoulder',
        name: 'Right Shoulder',
        path: 'M 130,110 L 160,110 L 160,130 L 130,130 Z',
        centerX: 145,
        centerY: 120
      },
      {
        id: 'right-upper-arm',
        name: 'Right Upper Arm',
        path: 'M 130,130 L 160,130 L 160,160 L 130,160 Z',
        centerX: 145,
        centerY: 145
      },
      {
        id: 'right-lower-arm',
        name: 'Right Lower Arm',
        path: 'M 130,160 L 160,160 L 160,200 L 130,200 Z',
        centerX: 145,
        centerY: 180
      }
    ]
  },
  {
    id: 'left-leg',
    name: 'Left Leg',
    path: 'M 70,220 L 100,220 L 100,300 L 70,300 Z',
    centerX: 85,
    centerY: 260,
    subRegions: [
      {
        id: 'left-upper-leg',
        name: 'Left Upper Leg',
        path: 'M 70,220 L 100,220 L 100,260 L 70,260 Z',
        centerX: 85,
        centerY: 240
      },
      {
        id: 'left-lower-leg',
        name: 'Left Lower Leg',
        path: 'M 70,260 L 100,260 L 100,300 L 70,300 Z',
        centerX: 85,
        centerY: 280
      }
    ]
  },
  {
    id: 'right-leg',
    name: 'Right Leg',
    path: 'M 100,220 L 130,220 L 130,300 L 100,300 Z',
    centerX: 115,
    centerY: 260,
    subRegions: [
      {
        id: 'right-upper-leg',
        name: 'Right Upper Leg',
        path: 'M 100,220 L 130,220 L 130,260 L 100,260 Z',
        centerX: 115,
        centerY: 240
      },
      {
        id: 'right-lower-leg',
        name: 'Right Lower Leg',
        path: 'M 100,260 L 130,260 L 130,300 L 100,300 Z',
        centerX: 115,
        centerY: 280
      }
    ]
  }
]; 