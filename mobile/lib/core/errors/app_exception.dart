/// An error whose [message] is written for people and can be shown as is.
/// Anything else that is thrown is shown as a generic "something went wrong".
abstract interface class AppException implements Exception {
  String get message;
}
