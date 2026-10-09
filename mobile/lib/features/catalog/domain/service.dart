import 'package:tolely/core/l10n/localized_text.dart';

/// One size / type of a service with its price, e.g. "8,000 Liters · Rs 3,200".
class ServiceOption {
  const ServiceOption({required this.id, required this.label, required this.price});

  factory ServiceOption.fromJson(Map<String, dynamic> json) => ServiceOption(
    id: json['id'] as String,
    label: LocalizedText.fromFields(json, 'label'),
    price: (json['price'] as num).toInt(),
  );

  final String id;
  final LocalizedText label;

  /// Price in NPR. The server is the source of truth and re-checks it on booking.
  final int price;
}

/// A bookable service such as a water tanker or a plumber.
class Service {
  const Service({required this.key, required this.name, required this.icon, required this.options});

  factory Service.fromJson(Map<String, dynamic> json) => Service(
    key: json['key'] as String,
    name: LocalizedText.fromFields(json, 'name'),
    icon: json['icon'] as String,
    options: (json['options'] as List).map((o) => ServiceOption.fromJson(o as Map<String, dynamic>)).toList(),
  );

  final String key;
  final LocalizedText name;

  /// Icon name chosen in the admin dashboard; see `service_style.dart`.
  final String icon;
  final List<ServiceOption> options;

  ServiceOption get cheapest => options.reduce((a, b) => a.price <= b.price ? a : b);
}
