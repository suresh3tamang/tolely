import 'package:firebase_auth/firebase_auth.dart';
import 'package:tolely/core/errors/app_exception.dart';

/// A sign-in problem with a message that can be shown to the person.
class AuthFailure implements AppException {
  const AuthFailure(this.message);

  @override
  final String message;
}

/// Phone-number login with Firebase Auth (Nepal numbers, +977).
class AuthRepository {
  AuthRepository([FirebaseAuth? auth]) : _auth = auth ?? FirebaseAuth.instance;

  final FirebaseAuth _auth;

  /// Emits the signed-in user's id, or null when signed out.
  Stream<String?> get uidChanges => _auth.authStateChanges().map((user) => user?.uid);

  String? get currentUid => _auth.currentUser?.uid;

  String? get phoneNumber => _auth.currentUser?.phoneNumber;

  /// ID token sent to the backend with every request.
  Future<String?> idToken() async => _auth.currentUser?.getIdToken();

  /// Sends an SMS code to [localNumber] (10 digits, without +977).
  /// [onCodeSent] receives the id needed by [confirmCode].
  Future<void> sendCode(
    String localNumber, {
    required void Function(String verificationId) onCodeSent,
    required void Function(AuthFailure failure) onFailed,
  }) => _auth.verifyPhoneNumber(
    phoneNumber: '+977$localNumber',
    // Android can read the SMS itself and sign in without the code step.
    verificationCompleted: (credential) => _auth.signInWithCredential(credential),
    verificationFailed: (e) => onFailed(AuthFailure(e.message ?? e.code)),
    codeSent: (id, _) => onCodeSent(id),
    codeAutoRetrievalTimeout: (_) {},
  );

  Future<void> confirmCode({required String verificationId, required String code}) async {
    try {
      await _auth.signInWithCredential(PhoneAuthProvider.credential(verificationId: verificationId, smsCode: code));
    } on FirebaseAuthException catch (e) {
      throw AuthFailure(e.message ?? e.code);
    }
  }

  Future<void> signOut() => _auth.signOut();
}
