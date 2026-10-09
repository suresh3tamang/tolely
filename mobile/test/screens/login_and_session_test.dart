import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/auth/presentation/login_screen.dart';
import 'package:tolely/features/auth/presentation/session_gate.dart';
import 'package:tolely/features/profile/domain/session.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

import '../helpers/pump_app.dart';

void main() {
  late Fakes fakes;

  setUp(() => fakes = Fakes());

  group('login', () {
    testWidgets('asks for a 10-digit number before sending a code', (tester) async {
      await pumpScreen(tester, const LoginScreen(), fakes, language: 'en');

      await tester.enterText(find.byType(TextField), '98123');
      await tester.tap(find.text('Send code'));
      await tester.pump();

      expect(find.text('Enter a 10-digit mobile number.'), findsOneWidget);
      verifyNever(
        () => fakes.auth.sendCode(
          any(),
          onCodeSent: any(named: 'onCodeSent'),
          onFailed: any(named: 'onFailed'),
        ),
      );
    });

    testWidgets('sends the code, then asks for it and confirms', (tester) async {
      when(
        () => fakes.auth.sendCode(
          any(),
          onCodeSent: any(named: 'onCodeSent'),
          onFailed: any(named: 'onFailed'),
        ),
      ).thenAnswer((invocation) async {
        (invocation.namedArguments[#onCodeSent] as void Function(String))('verification-1');
      });
      when(
        () => fakes.auth.confirmCode(
          verificationId: any(named: 'verificationId'),
          code: any(named: 'code'),
        ),
      ).thenAnswer((_) async {});
      await pumpScreen(tester, const LoginScreen(), fakes, language: 'en');

      await tester.enterText(find.byType(TextField), '9800000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      verify(
        () => fakes.auth.sendCode(
          '9800000001',
          onCodeSent: any(named: 'onCodeSent'),
          onFailed: any(named: 'onFailed'),
        ),
      ).called(1);

      expect(find.text('Enter the 6-digit code'), findsOneWidget);
      await tester.enterText(find.byType(TextField), '111111');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();
      verify(() => fakes.auth.confirmCode(verificationId: 'verification-1', code: '111111')).called(1);
    });

    testWidgets('shows why a wrong code failed', (tester) async {
      when(
        () => fakes.auth.sendCode(
          any(),
          onCodeSent: any(named: 'onCodeSent'),
          onFailed: any(named: 'onFailed'),
        ),
      ).thenAnswer((i) async => (i.namedArguments[#onCodeSent] as void Function(String))('v1'));
      when(
        () => fakes.auth.confirmCode(
          verificationId: any(named: 'verificationId'),
          code: any(named: 'code'),
        ),
      ).thenThrow(const AuthFailure('The code is wrong.'));
      await pumpScreen(tester, const LoginScreen(), fakes, language: 'en');

      await tester.enterText(find.byType(TextField), '9800000001');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), '000000');
      await tester.tap(find.text('Verify'));
      await tester.pumpAndSettle();

      expect(find.text('The code is wrong.'), findsOneWidget);
    });

    testWidgets('the language button on the login screen works', (tester) async {
      await pumpScreen(tester, const LoginScreen(), fakes);
      expect(find.text('आफ्नो मोबाइल नम्बर लेख्नुहोस्'), findsOneWidget);

      await tester.tap(find.text('English'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your mobile number'), findsOneWidget);
    });
  });

  group('session gate (who are you, what do you see)', () {
    Future<LocaleController> pumpGate(WidgetTester tester, Session session, {String language = 'en'}) {
      when(() => fakes.profile.session()).thenAnswer((_) async => session);
      return pumpScreen(tester, const SessionGate(), fakes, language: language);
    }

    testWidgets('a customer lands on Home', (tester) async {
      await pumpGate(tester, const Session(user: customerProfile));
      expect(find.text('Namaste, Suresh 👋'), findsOneWidget);
    });

    testWidgets('a new account chooses how to use Tolely', (tester) async {
      await pumpGate(tester, const Session());
      expect(find.text('I need a service'), findsOneWidget);
      expect(find.text('I provide a service'), findsOneWidget);
    });

    testWidgets('an unverified supplier waits', (tester) async {
      await pumpGate(
        tester,
        const Session(
          user: UserProfile(uid: 'u1', role: UserRole.supplier, name: 'Hari'),
          supplier: SupplierAccount(name: 'Hari', phone: '+977', area: 'Thimi', services: ['tanker'], verified: false),
        ),
      );
      expect(find.textContaining('waiting for verification'), findsWidgets);
    });

    testWidgets('the language saved on the server is applied after login', (tester) async {
      final locale = await pumpGate(
        tester,
        const Session(
          user: UserProfile(uid: 'u1', role: UserRole.customer, name: 'Suresh', language: 'ne'),
        ),
        language: 'en',
      );
      expect(locale.code, 'ne');
      expect(find.text('नमस्ते, Suresh 👋'), findsOneWidget);
    });

    testWidgets('reconnects notifications without asking for permission', (tester) async {
      await pumpGate(tester, const Session(user: customerProfile));
      verify(() => fakes.push.start(supplierServices: const [], ask: false)).called(1);
      verifyNever(() => fakes.push.start(supplierServices: any(named: 'supplierServices'), ask: true));
    });

    testWidgets('a failed load can be retried', (tester) async {
      var calls = 0;
      when(() => fakes.profile.session()).thenAnswer((_) async {
        if (calls++ == 0) throw Exception('offline');
        return const Session(user: customerProfile);
      });
      await pumpScreen(tester, const SessionGate(), fakes, language: 'en');

      expect(find.text('Try again'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(find.text('Namaste, Suresh 👋'), findsOneWidget);
    });

    testWidgets('provider wiring: screens can read the language controller', (tester) async {
      await pumpGate(tester, const Session(user: customerProfile));
      final context = tester.element(find.text('Namaste, Suresh 👋'));
      expect(context.read<LocaleController>().code, 'en');
    });
  });
}
