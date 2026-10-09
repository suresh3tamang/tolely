import 'package:flutter_map/flutter_map.dart';

/// OpenStreetMap tiles. For heavy production traffic, switch to a paid tile
/// provider (OSM's free servers have a fair-use policy).
TileLayer osmTiles() =>
    TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.tolely.app');
