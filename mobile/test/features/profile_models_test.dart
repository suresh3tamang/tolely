import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/features/profile/domain/session.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

void main() {
  test('Session reads the /api/me answer', () {
    final session = Session.fromJson({
      'user': {'uid': 'u1', 'role': 'customer', 'name': 'Suresh Tamang', 'address': 'Balkot', 'language': 'en'},
      'supplier': null,
    });
    expect(session.role, UserRole.customer);
    expect(session.user?.firstName, 'Suresh');
    expect(session.user?.language, 'en');
    expect(session.supplier, isNull);
  });

  test('a brand-new account has no profile yet', () {
    final session = Session.fromJson({'user': null, 'supplier': null});
    expect(session.user, isNull);
    expect(session.role, isNull);
  });

  group('SupplierAccount', () {
    SupplierAccount make(Map<String, dynamic> extra) => SupplierAccount.fromJson({
      'name': 'Hari',
      'phone': '+9779800000002',
      'area': 'Baneshwor',
      'services': ['tanker', 'plumber'],
      ...extra,
    });

    test('is online unless switched off', () {
      expect(make({}).online, isTrue);
      expect(make({'online': false}).online, isFalse);
    });

    test('only verified, online suppliers get job alerts', () {
      expect(make({'verified': true}).alertServices, ['tanker', 'plumber']);
      expect(make({'verified': false}).alertServices, isEmpty);
      expect(make({'verified': true, 'online': false}).alertServices, isEmpty);
    });

    test('average rating', () {
      expect(make({}).averageRating, isNull);
      expect(make({'ratingSum': 23, 'ratingCount': 5}).averageRating, closeTo(4.6, 0.001));
    });
  });
}
