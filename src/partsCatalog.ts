import type { PartDefinition } from './parts'

export const PARTS: PartDefinition[] = [
  {
    "id": "ANGL",
    "name": "Angle",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "aluminum",
    "icon": "/part-icons/ANGL.png",
    "param1": {
      "name": "Size",
      "defaultValue": "1x1",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "1x1",
        "2x2",
        "3x3"
      ]
    },
    "param2": {
      "name": "Width",
      "defaultValue": "5",
      "custom": true,
      "unit": "Holes",
      "customDefault": "5",
      "min": 1.0,
      "max": 35.0,
      "options": []
    },
    "variants": [],
    "mesh": {
      "meshName": "ANGL",
      "fbx": "Structure/Angles.fbx",
      "splitFbx": "Structure/Angles (split).fbx"
    }
  },
  {
    "id": "BSPT",
    "name": "Base Plate",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/BSPT.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Base Plate",
      "fbx": "Extra Structure/Base Plate.fbx"
    }
  },
  {
    "id": "CCHL",
    "name": "C-Channel",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "aluminum",
    "icon": "/part-icons/CCHL.png",
    "param1": {
      "name": "Size",
      "defaultValue": "1x2",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "1x2",
        "1x3",
        "1x5"
      ]
    },
    "param2": {
      "name": "Width",
      "defaultValue": "5",
      "custom": true,
      "unit": "Holes",
      "customDefault": "5",
      "min": 1.0,
      "max": 35.0,
      "options": []
    },
    "variants": [],
    "mesh": {
      "meshName": "CCHL",
      "fbx": "Structure/C-Channels.fbx",
      "splitFbx": "Structure/C-Channels (split).fbx"
    }
  },
  {
    "id": "GSET",
    "name": "Gussets",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/GSET.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Coupler",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Pack",
        "45 Degree",
        "30 Degree",
        "90 Degree",
        "Coupler",
        "60 Degree"
      ]
    },
    "param2": {
      "name": "Type",
      "defaultValue": "Angle",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Angle",
        "Plate",
        "Bent",
        "Flat",
        "Pivot",
        "Channel",
        "Plus",
        "Angle Corner"
      ]
    },
    "variants": [
      {
        "param1": "Pack",
        "param2": "Angle",
        "meshName": "Angle",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "45 Degree",
        "param2": "Plate",
        "meshName": "Plate",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "30 Degree",
        "param2": "Bent",
        "meshName": "Bent",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "45 Degree",
        "param2": "Bent",
        "meshName": "Bent",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "90 Degree",
        "param2": "Plate",
        "meshName": "Plate",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "30 Degree",
        "param2": "Flat",
        "meshName": "Flat",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "90 Degree",
        "param2": "Flat",
        "meshName": "Flat",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "45 Degree",
        "param2": "Flat",
        "meshName": "Flat",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "90 Degree",
        "param2": "Angle",
        "meshName": "Angle",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "Pack",
        "param2": "Pivot",
        "meshName": "Pivot",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "90 Degree",
        "param2": "Bent",
        "meshName": "Bent",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "Coupler",
        "param2": "Angle",
        "meshName": "Angle",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "60 Degree",
        "param2": "Bent",
        "meshName": "Bent",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "Coupler",
        "param2": "Channel",
        "meshName": "C-Channel",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "Pack",
        "param2": "Plus",
        "meshName": "Plus",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "60 Degree",
        "param2": "Flat",
        "meshName": "Flat",
        "fbx": "Structure/Gussets.fbx"
      },
      {
        "param1": "Coupler",
        "param2": "Angle Corner",
        "meshName": "Angle Corner",
        "fbx": "Structure/Gussets.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "NUT",
    "name": "Nut",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/NUT.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Lock",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Keps",
        "Low Profile",
        "Lock",
        "Hex"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Keps",
        "param2": "",
        "meshName": "Keps Nut",
        "fbx": "Structure/Nuts.fbx"
      },
      {
        "param1": "Low Profile",
        "param2": "",
        "meshName": "Low Profile",
        "fbx": "Structure/Nuts.fbx"
      },
      {
        "param1": "Lock",
        "param2": "",
        "meshName": "Lock Nut",
        "fbx": "Structure/Nuts.fbx"
      },
      {
        "param1": "Hex",
        "param2": "",
        "meshName": "Hex Nut",
        "fbx": "Structure/Nuts.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "PLTE",
    "name": "Plate",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "plate",
    "icon": "/part-icons/PLTE.png",
    "param1": {
      "name": "Length",
      "defaultValue": "5",
      "custom": true,
      "unit": "Holes",
      "customDefault": "5",
      "min": 1.0,
      "max": 25.0,
      "options": []
    },
    "param2": {
      "name": "Width",
      "defaultValue": "5",
      "custom": true,
      "unit": "Holes",
      "customDefault": "5",
      "min": 1.0,
      "max": 5.0,
      "options": []
    },
    "variants": [],
    "mesh": {
      "meshName": "1x1 Plate",
      "fbx": "Structure/1x1 Plate.fbx"
    }
  },
  {
    "id": "RAIL",
    "name": "Rail",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/RAIL.png",
    "param1": {
      "name": "Size",
      "defaultValue": "2x25",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "2x35",
        "2x25"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "2x35",
        "param2": "",
        "meshName": "2x35",
        "fbx": "Extra Structure/Rails.fbx"
      },
      {
        "param1": "2x25",
        "param2": "",
        "meshName": "2x25",
        "fbx": "Extra Structure/Rails.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "SCRW",
    "name": "Screw",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": true,
    "generator": "child",
    "icon": "/part-icons/SCRW.png",
    "param1": {
      "name": "Size",
      "defaultValue": "1/4in",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "2.25in",
        "2.50in",
        "7/8in",
        "2.00in",
        "1.50in",
        "1/4in",
        "3/8in",
        "1.75in",
        "1.00in",
        "5/8in",
        "3/4in",
        "1.25in",
        "1/2in"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "2.25in",
        "param2": "",
        "meshName": "2.25in",
        "fbx": null
      },
      {
        "param1": "2.50in",
        "param2": "",
        "meshName": "2.50in",
        "fbx": null
      },
      {
        "param1": "7/8in",
        "param2": "",
        "meshName": "7/8in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "2.00in",
        "param2": "",
        "meshName": "2.00in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "1.50in",
        "param2": "",
        "meshName": "1.50in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "1/4in",
        "param2": "",
        "meshName": "1/4in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "3/8in",
        "param2": "",
        "meshName": "3/8in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "1.75in",
        "param2": "",
        "meshName": "1.75in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "1.00in",
        "param2": "",
        "meshName": "1.00in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "5/8in",
        "param2": "",
        "meshName": "5/8in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "3/4in",
        "param2": "",
        "meshName": "3/4in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "1.25in",
        "param2": "",
        "meshName": "1.25in",
        "fbx": "Structure/Screws.fbx"
      },
      {
        "param1": "1/2in",
        "param2": "",
        "meshName": "1/2in",
        "fbx": "Structure/Screws.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "SNDF",
    "name": "Standoff",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/SNDF.png",
    "param1": {
      "name": "Size",
      "defaultValue": "3/4in",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "3.00in",
        "2.00in",
        "6.00in",
        "1/2in",
        "3/4in",
        "5.00in",
        "2.50in",
        "1.00in",
        "1/4in",
        "1.50in",
        "4.00in"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "3.00in",
        "param2": "",
        "meshName": "3.00in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "2.00in",
        "param2": "",
        "meshName": "2.00in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "6.00in",
        "param2": "",
        "meshName": "6.00in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "1/2in",
        "param2": "",
        "meshName": "1/2in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "3/4in",
        "param2": "",
        "meshName": "3/4in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "5.00in",
        "param2": "",
        "meshName": "5.00in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "2.50in",
        "param2": "",
        "meshName": "2.50in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "1.00in",
        "param2": "",
        "meshName": "1.00in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "1/4in",
        "param2": "",
        "meshName": "1/4in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "1.50in",
        "param2": "",
        "meshName": "1.50in",
        "fbx": "Structure/Standoffs.fbx"
      },
      {
        "param1": "4.00in",
        "param2": "",
        "meshName": "4.00in",
        "fbx": "Structure/Standoffs.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "UCHL",
    "name": "U-Channel",
    "group": "Structure",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "aluminum",
    "icon": "/part-icons/UCHL.png",
    "param1": {
      "name": "Size",
      "defaultValue": "2x2",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "2x2"
      ]
    },
    "param2": {
      "name": "Width",
      "defaultValue": "5",
      "custom": true,
      "unit": "Holes",
      "customDefault": "20",
      "min": 1.0,
      "max": 20.0,
      "options": []
    },
    "variants": [],
    "mesh": {
      "meshName": "UCHL",
      "fbx": "Structure/U-Channels (split).fbx",
      "splitFbx": "Structure/U-Channels (split).fbx"
    }
  },
  {
    "id": "BLCK",
    "name": "Block Bearing",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/BLCK.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Normal",
        "High Strength"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Normal",
        "param2": "",
        "meshName": "Block Bearing",
        "fbx": "Shafts and Hardware/Bearings.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "",
        "meshName": "High Strength Block Bearing",
        "fbx": "Shafts and Hardware/HSBlockBearing.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "BRNG",
    "name": "Flat Bearing",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/BRNG.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Normal",
        "High Strength",
        "Low Profile",
        "Collar Retainer"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Normal",
        "param2": "",
        "meshName": "Normal",
        "fbx": "Shafts and Hardware/Bearings.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "",
        "meshName": "High Strength",
        "fbx": "Shafts and Hardware/Bearings.fbx"
      },
      {
        "param1": "Low Profile",
        "param2": "",
        "meshName": "Low Profile Bearing Flat (276-8023)",
        "fbx": "Shafts and Hardware/LSandCollarBearing.fbx"
      },
      {
        "param1": "Collar Retainer",
        "param2": "",
        "meshName": "Shaft Collar Retainer with Bearing Flat (276-8024)",
        "fbx": "Shafts and Hardware/LSandCollarBearing.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "FWHL",
    "name": "Flex Wheel",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/FWHL.png",
    "param1": {
      "name": "Adapters",
      "defaultValue": "With Adapters",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "With Adapters",
        "No Adapters"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "1.625in",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "3.00in",
        "1.625in",
        "4.00in",
        "2.00in"
      ]
    },
    "variants": [
      {
        "param1": "With Adapters",
        "param2": "3.00in",
        "meshName": "3.00in",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "With Adapters",
        "param2": "1.625in",
        "meshName": "1.625in",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "No Adapters",
        "param2": "4.00in",
        "meshName": "4.00in (Empty)",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "With Adapters",
        "param2": "4.00in",
        "meshName": "4.00in",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "No Adapters",
        "param2": "2.00in",
        "meshName": "2.00in (Empty)",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "No Adapters",
        "param2": "3.00in",
        "meshName": "3.00in (Empty)",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "With Adapters",
        "param2": "2.00in",
        "meshName": "2.00in",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      },
      {
        "param1": "No Adapters",
        "param2": "1.625in",
        "meshName": "1.625in (Empty)",
        "fbx": "Shafts and Hardware/Wheels/Flex Wheels.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "GEAR",
    "name": "Gear",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/GEAR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "High Strength v2",
        "High Strength",
        "Normal"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "12T",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "48T",
        "60T",
        "36T",
        "84T",
        "12T",
        "72T",
        "24T"
      ]
    },
    "variants": [
      {
        "param1": "High Strength v2",
        "param2": "48T",
        "meshName": "48T",
        "fbx": "Gears and Sprockets/HS v2 Gears.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "60T",
        "meshName": "60T",
        "fbx": "Gears and Sprockets/HS Gears.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "36T",
        "meshName": "36T",
        "fbx": "Gears and Sprockets/HS Gears.fbx"
      },
      {
        "param1": "Normal",
        "param2": "36T",
        "meshName": "36T",
        "fbx": "Gears and Sprockets/Gears.fbx"
      },
      {
        "param1": "Normal",
        "param2": "84T",
        "meshName": "84T",
        "fbx": "Gears and Sprockets/Gears.fbx"
      },
      {
        "param1": "Normal",
        "param2": "60T",
        "meshName": "60T",
        "fbx": "Gears and Sprockets/Gears.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "84T",
        "meshName": "84T",
        "fbx": "Gears and Sprockets/HS Gears.fbx"
      },
      {
        "param1": "Normal",
        "param2": "12T",
        "meshName": "12T",
        "fbx": "Gears and Sprockets/Gears.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "12T",
        "meshName": "12T",
        "fbx": "Gears and Sprockets/HS Gears.fbx"
      },
      {
        "param1": "High Strength v2",
        "param2": "36T",
        "meshName": "36T",
        "fbx": "Gears and Sprockets/HS v2 Gears.fbx"
      },
      {
        "param1": "High Strength v2",
        "param2": "72T",
        "meshName": "72T",
        "fbx": "Gears and Sprockets/HS v2 Gears.fbx"
      },
      {
        "param1": "High Strength v2",
        "param2": "84T",
        "meshName": "84T",
        "fbx": "Gears and Sprockets/HS v2 Gears.fbx"
      },
      {
        "param1": "High Strength v2",
        "param2": "60T",
        "meshName": "60T",
        "fbx": "Gears and Sprockets/HS v2 Gears.fbx"
      },
      {
        "param1": "High Strength v2",
        "param2": "24T",
        "meshName": "24T",
        "fbx": "Gears and Sprockets/HS v2 Gears.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "HexNR",
    "name": "Hex Nut Retainer",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/HexNR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Nut Retainer",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Nut Retainer",
        "Bearing Retainer",
        "Square Retainer"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Nut Retainer",
        "param2": "",
        "meshName": "_1_Post_Hex_Nut_Retainer__276_6482_",
        "fbx": "Shafts and Hardware/HexNutBearings.fbx"
      },
      {
        "param1": "Bearing Retainer",
        "param2": "",
        "meshName": "_1_Post_Hex_Nut_Retainer_w__Bearing_Flat__276_6481_",
        "fbx": "Shafts and Hardware/HexNutBearings.fbx"
      },
      {
        "param1": "Square Retainer",
        "param2": "",
        "meshName": "_4_Post_Hex_Nut_Retainer__276_6483_",
        "fbx": "Shafts and Hardware/HexNutBearings.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "LMTK",
    "name": "Linear Motion Kit",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/LMTK.png",
    "param1": {
      "name": "Part",
      "defaultValue": "Inner Slide Trunk",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Linear Slide Bracket",
        "Outer Slide Trunk",
        "Inner Slide Trunk"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Linear Slide Bracket",
        "param2": "",
        "meshName": "LinearSlideBracket",
        "fbx": "Linear Motion Kit/LinearSlideBracket.fbx"
      },
      {
        "param1": "Outer Slide Trunk",
        "param2": "",
        "meshName": "OuterSlideTrunk",
        "fbx": "Linear Motion Kit/OuterSlideTrunk.fbx"
      },
      {
        "param1": "Inner Slide Trunk",
        "param2": "",
        "meshName": "InnerSlideTrunk",
        "fbx": "Linear Motion Kit/InnerSlideTrunk.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "LKBR",
    "name": "Lock Bar",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/LKBR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Metal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Metal",
        "Plastic"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Metal",
        "param2": "",
        "meshName": "Metal",
        "fbx": "Shafts and Hardware/Lock Bars.fbx"
      },
      {
        "param1": "Plastic",
        "param2": "",
        "meshName": "Plastic",
        "fbx": "Shafts and Hardware/Lock Bars.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "MECN",
    "name": "Mecanum Wheel",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/MECN.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Mecanum Wheel",
      "fbx": "Shafts and Hardware/Wheels/MechanumWheel.fbx"
    }
  },
  {
    "id": "MCMS",
    "name": "Mechanisms",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/MCMS.png",
    "param1": {
      "name": "Part",
      "defaultValue": "Bevel Gear",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Worm and Wheel",
        "Bevel Gear",
        "Rack",
        "Cam Follower",
        "Drop Off Cam",
        "Screw Kit",
        "Hand Crank"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "16T",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Gear",
        "32T",
        "Worm",
        "Bracket",
        "16T",
        "Worm Gear",
        "Worm Nut"
      ]
    },
    "variants": [
      {
        "param1": "Worm and Wheel",
        "param2": "Gear",
        "meshName": "Worm Gearl",
        "fbx": "Linear Motion Kit/wormandgear2.fbx"
      },
      {
        "param1": "Bevel Gear",
        "param2": "32T",
        "meshName": "32t Bevel Gear",
        "fbx": "Advanced Mechanics/Advancedmechanics.fbx"
      },
      {
        "param1": "Worm and Wheel",
        "param2": "Worm",
        "meshName": "Worm Wheel",
        "fbx": "Linear Motion Kit/wormandgear2.fbx"
      },
      {
        "param1": "Rack",
        "param2": "",
        "meshName": "RackGearV2",
        "fbx": "Linear Motion Kit/RackGearV2.fbx"
      },
      {
        "param1": "Cam Follower",
        "param2": "",
        "meshName": "camfollower",
        "fbx": "Advanced Mechanics/camfollower.fbx"
      },
      {
        "param1": "Drop Off Cam",
        "param2": "",
        "meshName": "Drop Off Cam",
        "fbx": "Advanced Mechanics/Advancedmechanics.fbx"
      },
      {
        "param1": "Screw Kit",
        "param2": "Bracket",
        "meshName": "Lead Screw Bracket",
        "fbx": "Advanced Mechanics/Advancedmechanics.fbx"
      },
      {
        "param1": "Bevel Gear",
        "param2": "16T",
        "meshName": "16t Bevel Gear",
        "fbx": "Advanced Mechanics/Advancedmechanics.fbx"
      },
      {
        "param1": "Screw Kit",
        "param2": "Worm Gear",
        "meshName": "Lead Screw",
        "fbx": "Advanced Mechanics/worm3.fbx"
      },
      {
        "param1": "Hand Crank",
        "param2": "",
        "meshName": "Hand Crank",
        "fbx": "Advanced Mechanics/CrankandScrew.fbx"
      },
      {
        "param1": "Screw Kit",
        "param2": "Worm Nut",
        "meshName": "Lead Screw Nut",
        "fbx": "Advanced Mechanics/Advancedmechanics.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "OMNI",
    "name": "Omni Wheel",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/OMNI.png",
    "param1": {
      "name": "Type",
      "defaultValue": "V1",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "V1",
        "V2"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "3.25in",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "2.75in",
        "4.00in",
        "3.25in",
        "2.00in"
      ]
    },
    "variants": [
      {
        "param1": "V1",
        "param2": "2.75in",
        "meshName": "2.75in",
        "fbx": "Shafts and Hardware/Wheels/OmniWheels.fbx"
      },
      {
        "param1": "V1",
        "param2": "4.00in",
        "meshName": "4.00in",
        "fbx": "Shafts and Hardware/Wheels/OmniWheels.fbx"
      },
      {
        "param1": "V1",
        "param2": "3.25in",
        "meshName": "3.25in",
        "fbx": "Shafts and Hardware/Wheels/OmniWheels.fbx"
      },
      {
        "param1": "V2",
        "param2": "2.00in",
        "meshName": "2.00in New",
        "fbx": "Shafts and Hardware/Wheels/V2OmniWheels.fbx"
      },
      {
        "param1": "V2",
        "param2": "2.75in",
        "meshName": "2.75in New",
        "fbx": "Shafts and Hardware/Wheels/V2OmniWheels.fbx"
      },
      {
        "param1": "V2",
        "param2": "4.00in",
        "meshName": "4.00in New",
        "fbx": "Shafts and Hardware/Wheels/V2OmniWheels.fbx"
      },
      {
        "param1": "V2",
        "param2": "3.25in",
        "meshName": "3.25in New",
        "fbx": "Shafts and Hardware/Wheels/V2OmniWheels.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "RAIL",
    "name": "Rails",
    "group": "Motion",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "aluminum",
    "icon": "/part-icons/RAIL.png",
    "param1": {
      "name": "Part",
      "defaultValue": "Rail",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Rail"
      ]
    },
    "param2": {
      "name": "Width",
      "defaultValue": "24",
      "custom": true,
      "unit": "Holes",
      "customDefault": "24",
      "min": 1.0,
      "max": 24.0,
      "options": []
    },
    "variants": [],
    "mesh": {
      "meshName": "EndRail",
      "fbx": "Linear Motion Kit/EndRail.fbx",
      "splitFbx": null
    }
  },
  {
    "id": "RBMP",
    "name": "Rubber Bumper",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/RBMP.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "RubberBumper",
      "fbx": "Shafts and Hardware/RubberBumper.fbx"
    }
  },
  {
    "id": "SHFT",
    "name": "Shaft",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": true,
    "generator": "shaft",
    "icon": "/part-icons/SHFT.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Normal",
        "High Strength"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "3.9",
      "custom": true,
      "unit": "in",
      "customDefault": "6",
      "min": 1.0,
      "max": 12.0,
      "options": []
    },
    "variants": [
      {
        "param1": "Normal",
        "param2": "",
        "meshName": "Normal Shaft",
        "fbx": "Shafts and Hardware/Shafts.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "",
        "meshName": "HS Shaft",
        "fbx": "Shafts and Hardware/Shafts.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "CLMP",
    "name": "Shaft Collar",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/CLMP.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Clamping",
        "Normal"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Normal",
        "High Strength",
        "Low Profile HS"
      ]
    },
    "variants": [
      {
        "param1": "Clamping",
        "param2": "Normal",
        "meshName": "Normal Clamping Shaft Collar",
        "fbx": "Shafts and Hardware/Shaft Collars.fbx"
      },
      {
        "param1": "Clamping",
        "param2": "High Strength",
        "meshName": "High Strength Clamping Shaft Collar",
        "fbx": "Shafts and Hardware/Shaft Collars.fbx"
      },
      {
        "param1": "Normal",
        "param2": "Normal",
        "meshName": "shaftcollar",
        "fbx": "Shafts and Hardware/shaftcollar.fbx"
      },
      {
        "param1": "Clamping",
        "param2": "Low Profile HS",
        "meshName": "LowProfileHSClamp",
        "fbx": "Shafts and Hardware/LowProfileHSClamp.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "SPCR",
    "name": "Spacer",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/SPCR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Nylon",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Plastic",
        "High Strength",
        "Nylon"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "1/4in",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "4.6mm",
        "1/4in",
        "1/16in",
        "1/2in",
        "1/8in",
        "3/8in",
        "8mm"
      ]
    },
    "variants": [
      {
        "param1": "Plastic",
        "param2": "4.6mm",
        "meshName": "4.6mm",
        "fbx": "Shafts and Hardware/Plastic Spacers.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "1/4in",
        "meshName": "1/4in",
        "fbx": "Shafts and Hardware/Plastic Spacers.fbx"
      },
      {
        "param1": "Nylon",
        "param2": "1/4in",
        "meshName": "1/4in",
        "fbx": "Shafts and Hardware/Nylon Spacers.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "1/16in",
        "meshName": "1/16in",
        "fbx": "Shafts and Hardware/Plastic Spacers.fbx"
      },
      {
        "param1": "Nylon",
        "param2": "1/2in",
        "meshName": "1/2in",
        "fbx": "Shafts and Hardware/Nylon Spacers.fbx"
      },
      {
        "param1": "Nylon",
        "param2": "1/8in",
        "meshName": "1/8in",
        "fbx": "Shafts and Hardware/Nylon Spacers.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "1/8in",
        "meshName": "1/8in",
        "fbx": "Shafts and Hardware/Plastic Spacers.fbx"
      },
      {
        "param1": "Nylon",
        "param2": "3/8in",
        "meshName": "3/8in",
        "fbx": "Shafts and Hardware/Nylon Spacers.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "1/2in",
        "meshName": "1/2in",
        "fbx": "Shafts and Hardware/Plastic Spacers.fbx"
      },
      {
        "param1": "Plastic",
        "param2": "8mm",
        "meshName": "8mm",
        "fbx": "Shafts and Hardware/Plastic Spacers.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "SPKT",
    "name": "Sprocket",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/SPKT.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Normal",
        "High Strength"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "10T",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "24T",
        "18T",
        "15T",
        "10T",
        "30T",
        "6T",
        "12T",
        "48T",
        "40T"
      ]
    },
    "variants": [
      {
        "param1": "Normal",
        "param2": "24T",
        "meshName": "24T",
        "fbx": "Gears and Sprockets/Sprockets.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "18T",
        "meshName": "18T",
        "fbx": "Gears and Sprockets/HS Sprockets.fbx"
      },
      {
        "param1": "Normal",
        "param2": "15T",
        "meshName": "15T",
        "fbx": "Gears and Sprockets/Sprockets.fbx"
      },
      {
        "param1": "Normal",
        "param2": "10T",
        "meshName": "10T",
        "fbx": "Gears and Sprockets/Sprockets.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "30T",
        "meshName": "30T",
        "fbx": "Gears and Sprockets/HS Sprockets.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "24T",
        "meshName": "24T",
        "fbx": "Gears and Sprockets/HS Sprockets.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "6T",
        "meshName": "6T",
        "fbx": "Gears and Sprockets/HS Sprockets.fbx"
      },
      {
        "param1": "High Strength",
        "param2": "12T",
        "meshName": "12T",
        "fbx": "Gears and Sprockets/HS Sprockets.fbx"
      },
      {
        "param1": "Normal",
        "param2": "48T",
        "meshName": "48T",
        "fbx": "Gears and Sprockets/Sprockets.fbx"
      },
      {
        "param1": "Normal",
        "param2": "40T",
        "meshName": "40T",
        "fbx": "Gears and Sprockets/Sprockets.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "TWHL",
    "name": "Traction Wheel",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/TWHL.png",
    "param1": {
      "name": "Type",
      "defaultValue": "V1",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "V2",
        "V1"
      ]
    },
    "param2": {
      "name": "Size",
      "defaultValue": "3.25in",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "2.75in",
        "3.25in",
        "5.00in",
        "4.00in"
      ]
    },
    "variants": [
      {
        "param1": "V2",
        "param2": "2.75in",
        "meshName": "2.75in New",
        "fbx": "Shafts and Hardware/Wheels/V2TractionWheels.fbx"
      },
      {
        "param1": "V2",
        "param2": "3.25in",
        "meshName": "3.25in New",
        "fbx": "Shafts and Hardware/Wheels/V2TractionWheels.fbx"
      },
      {
        "param1": "V1",
        "param2": "3.25in",
        "meshName": "3.25in",
        "fbx": "Shafts and Hardware/Wheels/TractionWheels.fbx"
      },
      {
        "param1": "V1",
        "param2": "2.75in",
        "meshName": "2.75in",
        "fbx": "Shafts and Hardware/Wheels/TractionWheels.fbx"
      },
      {
        "param1": "V1",
        "param2": "5.00in",
        "meshName": "5.00in",
        "fbx": "Shafts and Hardware/Wheels/TractionWheels.fbx"
      },
      {
        "param1": "V1",
        "param2": "4.00in",
        "meshName": "4.00in",
        "fbx": "Shafts and Hardware/Wheels/TractionWheels.fbx"
      },
      {
        "param1": "V2",
        "param2": "4.00in",
        "meshName": "4.00in New",
        "fbx": "Shafts and Hardware/Wheels/V2TractionWheels.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "WSHR",
    "name": "Washer",
    "group": "Motion",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/WSHR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Steel",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Teflon",
        "Steel"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Teflon",
        "param2": "",
        "meshName": "Teflon",
        "fbx": "Shafts and Hardware/Washers.fbx"
      },
      {
        "param1": "Steel",
        "param2": "",
        "meshName": "Steel",
        "fbx": "Shafts and Hardware/Washers.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "BTRY",
    "name": "Battery",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/BTRY.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Battery",
      "fbx": "Electronics/Battery.fbx"
    }
  },
  {
    "id": "BTCL",
    "name": "Battery Clip",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/BTCL.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Battery Clip",
      "fbx": "Electronics/Battery Clip.fbx"
    }
  },
  {
    "id": "BRAN",
    "name": "Brain",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/BRAN.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Brain",
      "fbx": "Electronics/Brain.fbx"
    }
  },
  {
    "id": "MOTR",
    "name": "Motor",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/MOTR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "11W",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "11W",
        "5.5W"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "11W",
        "param2": "",
        "meshName": "11W",
        "fbx": "Electronics/Motor.fbx"
      },
      {
        "param1": "5.5W",
        "param2": "",
        "meshName": "5.5W",
        "fbx": "Electronics/5.5WMotor.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "RDIO",
    "name": "Radio",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/RDIO.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Radio",
      "fbx": "Electronics/Radio.fbx"
    }
  },
  {
    "id": "SNSR",
    "name": "Sensor",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/SNSR.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Potentiometer",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Distance",
        "Line Tracker",
        "Vision",
        "Optical",
        "Potentiometer",
        "Inertial",
        "Rotation"
      ]
    },
    "param2": {
      "name": "Version",
      "defaultValue": "V5",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Cortex",
        "V5"
      ]
    },
    "variants": [
      {
        "param1": "Distance",
        "param2": "Cortex",
        "meshName": "Ultrasonic Range Finder",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Line Tracker",
        "param2": "Cortex",
        "meshName": "Line Tracker",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Vision",
        "param2": "V5",
        "meshName": "Vision",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Optical",
        "param2": "Cortex",
        "meshName": "Light Sensor",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Potentiometer",
        "param2": "V5",
        "meshName": "Potentiometer",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Inertial",
        "param2": "V5",
        "meshName": "Inertial Sensor",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Optical",
        "param2": "V5",
        "meshName": "Optical Sensor",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Rotation",
        "param2": "V5",
        "meshName": "Rotation Sensor",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Distance",
        "param2": "V5",
        "meshName": "Distance Sensor",
        "fbx": "Electronics/Sensor.fbx"
      },
      {
        "param1": "Rotation",
        "param2": "Cortex",
        "meshName": "Optical Shaft Encoder",
        "fbx": "Electronics/Sensor.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "SWCH",
    "name": "Switch",
    "group": "Electronics",
    "unityGroup": "Electronics",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/SWCH.png",
    "param1": {
      "name": "Type",
      "defaultValue": "Bumper",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Bumper",
        "Limit"
      ]
    },
    "param2": {
      "name": "Version",
      "defaultValue": "V5",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Cortex",
        "V5"
      ]
    },
    "variants": [
      {
        "param1": "Bumper",
        "param2": "Cortex",
        "meshName": "Cortex Bumper Switch",
        "fbx": "Electronics/Switch.fbx"
      },
      {
        "param1": "Bumper",
        "param2": "V5",
        "meshName": "V5 Bumper Switch",
        "fbx": "Electronics/Switch.fbx"
      },
      {
        "param1": "Limit",
        "param2": "Cortex",
        "meshName": "Limit Switch",
        "fbx": "Electronics/Switch.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "PNMT",
    "name": "Cylinder",
    "group": "Pneumatics",
    "unityGroup": "Motion",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/PNMT.png",
    "param1": {
      "name": "Size",
      "defaultValue": "25mm",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "25mm",
        "75mm",
        "50mm"
      ]
    },
    "param2": {
      "name": "Type",
      "defaultValue": "Normal",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Normal",
        "Extended"
      ]
    },
    "variants": [
      {
        "param1": "25mm",
        "param2": "Normal",
        "meshName": "25mmPiston",
        "fbx": "pnmatics/25mm Stroke Pneumatic Cylinder.fbx"
      },
      {
        "param1": "75mm",
        "param2": "Extended",
        "meshName": "75mmextended",
        "fbx": "pnmatics/75mmextended.fbx"
      },
      {
        "param1": "50mm",
        "param2": "Extended",
        "meshName": "50mmextended",
        "fbx": "pnmatics/50mmextended.fbx"
      },
      {
        "param1": "50mm",
        "param2": "Normal",
        "meshName": "50mmPiston",
        "fbx": "pnmatics/50mmPiston.fbx"
      },
      {
        "param1": "75mm",
        "param2": "Normal",
        "meshName": "75mmPiston",
        "fbx": "pnmatics/75mmPiston2.fbx"
      },
      {
        "param1": "25mm",
        "param2": "Extended",
        "meshName": "25mmextended",
        "fbx": "pnmatics/25mmextended.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "TANK",
    "name": "Reservoir",
    "group": "Pneumatics",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/TANK.png",
    "param1": {
      "name": "Type",
      "defaultValue": "V5",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "V5",
        "Legacy"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "V5",
        "param2": "",
        "meshName": "NewRes",
        "fbx": "pnmatics/NewRes.fbx"
      },
      {
        "param1": "Legacy",
        "param2": "",
        "meshName": "Legacy",
        "fbx": null
      }
    ],
    "mesh": null
  },
  {
    "id": "BLOK",
    "name": "Block",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/BLOK.png",
    "param1": {
      "name": "Color",
      "defaultValue": "Red",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Red",
        "Blue"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Red",
        "param2": "",
        "meshName": "RedBlock",
        "fbx": "Competition/Block.fbx"
      },
      {
        "param1": "Blue",
        "param2": "",
        "meshName": "BlueBlock",
        "fbx": "Competition/Block.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "CGOL",
    "name": "Center Goal",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/CGOL.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Center Goal",
      "fbx": "Competition/Center Goal.fbx"
    }
  },
  {
    "id": "FELD",
    "name": "High Stakes Field",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/FELD.png",
    "param1": {
      "name": "Type",
      "defaultValue": "With walls",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Without walls",
        "With walls"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Without walls",
        "param2": "",
        "meshName": "Fieldnowalls",
        "fbx": "Competition/Fieldnowalls.fbx"
      },
      {
        "param1": "With walls",
        "param2": "",
        "meshName": "Fieldwithwalls",
        "fbx": "Competition/Fieldwithwalls2.fbx"
      }
    ],
    "mesh": null
  },
  {
    "id": "LOAD",
    "name": "Loader",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/LOAD.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Loader",
      "fbx": "Competition/Loader.fbx"
    }
  },
  {
    "id": "LGOL",
    "name": "Long Goal",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/Long Goal.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Long Goal",
      "fbx": "Competition/Long Goal.fbx"
    }
  },
  {
    "id": "PUBA",
    "name": "Push Back Field",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/PUBA.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Push Back Field",
      "fbx": "Competition/Push Back Field.fbx"
    }
  },
  {
    "id": "RING",
    "name": "Ring",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "child",
    "icon": "/part-icons/RING.png",
    "param1": {
      "name": "Color",
      "defaultValue": "Red",
      "custom": false,
      "unit": "",
      "customDefault": "",
      "min": 0.0,
      "max": 0.0,
      "options": [
        "Red",
        "Blue"
      ]
    },
    "param2": null,
    "variants": [
      {
        "param1": "Red",
        "param2": "",
        "meshName": "RedRing",
        "fbx": null
      },
      {
        "param1": "Blue",
        "param2": "",
        "meshName": "BlueRing",
        "fbx": null
      }
    ],
    "mesh": null
  },
  {
    "id": "DISC",
    "name": "Spin Up Disc",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/DISC.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Spin Up Disc",
      "fbx": "Competition/Spin Up Disc.fbx"
    }
  },
  {
    "id": "SAKE",
    "name": "Stake",
    "group": "Competition",
    "unityGroup": "Structure",
    "connectingPart": false,
    "generator": "single",
    "icon": "/part-icons/SAKE.png",
    "param1": null,
    "param2": null,
    "variants": [],
    "mesh": {
      "meshName": "Stake",
      "fbx": null
    }
  }
]
