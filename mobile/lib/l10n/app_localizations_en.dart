// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Tolely';

  @override
  String get phoneTitle => 'Enter your mobile number';

  @override
  String get phoneHint => '98XXXXXXXX';

  @override
  String get sendCode => 'Send code';

  @override
  String get otpTitle => 'Enter the 6-digit code';

  @override
  String get verify => 'Verify';

  @override
  String get welcome => 'Welcome! How will you use Tolely?';

  @override
  String get iNeedService => 'I need a service';

  @override
  String get iProvideService => 'I provide a service';

  @override
  String get name => 'Your name';

  @override
  String get address => 'Address (tole, ward)';

  @override
  String get landmark => 'Landmark (e.g. near Shiva temple, blue gate)';

  @override
  String get workArea => 'Area you work in';

  @override
  String get servicesYouOffer => 'Services you offer';

  @override
  String get vehicleNo => 'Tanker vehicle number';

  @override
  String get waterSource => 'Water source (where you fill)';

  @override
  String get save => 'Save';

  @override
  String get home => 'Home';

  @override
  String get myBookings => 'My bookings';

  @override
  String get whatDoYouNeed => 'What do you need today?';

  @override
  String get chooseOption => 'Choose size / type';

  @override
  String get when => 'When?';

  @override
  String get payment => 'Payment';

  @override
  String get cash => 'Cash';

  @override
  String get qr => 'eSewa / Khalti QR';

  @override
  String get note => 'Note for supplier (optional)';

  @override
  String get confirmBooking => 'Confirm booking';

  @override
  String get booked => 'Booked! We will notify you when a supplier accepts.';

  @override
  String get noBookings => 'No bookings yet';

  @override
  String get cancel => 'Cancel';

  @override
  String get call => 'Call';

  @override
  String get rate => 'Rate this service';

  @override
  String get thanksRating => 'Thanks for rating!';

  @override
  String get statusPending => 'Finding supplier';

  @override
  String get statusAccepted => 'Accepted';

  @override
  String get statusOnTheWay => 'On the way';

  @override
  String get statusCompleted => 'Completed';

  @override
  String get statusCancelled => 'Cancelled';

  @override
  String get availableJobs => 'Available jobs';

  @override
  String get myJobs => 'My jobs';

  @override
  String get notVerified => 'Your account is waiting for verification. Our team will call you soon.';

  @override
  String get accept => 'Accept job';

  @override
  String get startTrip => 'I am on the way';

  @override
  String get markDone => 'Mark completed';

  @override
  String get release => 'Release job';

  @override
  String get noJobs => 'No jobs right now';

  @override
  String get logout => 'Log out';

  @override
  String get required => 'Required';

  @override
  String get profile => 'Profile';

  @override
  String get me => 'Me';

  @override
  String get languageLabel => 'Language';

  @override
  String get saved => 'Saved';

  @override
  String get deleteAccount => 'Delete account';

  @override
  String get deleteConfirm => 'Delete your account permanently? Your past bookings stay in our records.';

  @override
  String get supplierEditWarning => 'Changing your details sends your account for verification again.';

  @override
  String get details => 'Booking details';

  @override
  String get stepBooked => 'Booked';

  @override
  String get stepAccepted => 'Supplier accepted';

  @override
  String get stepOnTheWay => 'On the way';

  @override
  String get stepCompleted => 'Completed';

  @override
  String get stepCancelled => 'Cancelled';

  @override
  String get reportProblem => 'Report a problem';

  @override
  String get reportHint => 'What went wrong?';

  @override
  String get reportSent => 'Thanks. Our team will contact you.';

  @override
  String get send => 'Send';

  @override
  String get completedJobs => 'Jobs done';

  @override
  String get ratingLabel => 'Rating';

  @override
  String get earnedThisMonth => 'Earned this month';

  @override
  String get earnedTotal => 'Earned (last 100 jobs)';

  @override
  String get verifiedBadge => 'Verified supplier';

  @override
  String get scheduled => 'Scheduled';

  @override
  String get customer => 'Customer';

  @override
  String get supplier => 'Supplier';

  @override
  String get confirm => 'Yes';

  @override
  String get pinLocation => 'Pin your location';

  @override
  String get pinHelp => 'Move the map so the pin is on your house';

  @override
  String get confirmLocation => 'Use this location';

  @override
  String get locationOff => 'Could not get your location. Move the map by hand.';

  @override
  String get locationPinned => 'Location pinned on map';

  @override
  String get addMapPin => 'Pin location on map (helps the supplier find you)';

  @override
  String get directions => 'Directions';

  @override
  String get liveTracking => 'Live location of your supplier';

  @override
  String get online => 'Online';

  @override
  String get offline => 'Offline';

  @override
  String get offlineHint => 'You are offline. Go online to get new job alerts.';

  @override
  String get sharingLocation => 'Sharing your location with the customer';

  @override
  String get bookAgain => 'Book again';

  @override
  String get tagline => 'Trusted help from your own tole';

  @override
  String get phoneHelp => 'We\'ll send a 6-digit code to verify it\'s you.';

  @override
  String get otpHelp => 'Enter the code we sent by SMS.';

  @override
  String get changeNumber => 'Change number';

  @override
  String get namaste => 'Namaste';

  @override
  String get tipTitle => 'Clean your tank before monsoon';

  @override
  String get tipBody => 'Clean water starts with a clean tank. Book tank cleaning in a tap.';

  @override
  String get serviceUnavailable => 'This service is not available right now.';

  @override
  String get back => 'No';

  @override
  String fromPrice(String amount) {
    return 'From $amount';
  }

  @override
  String get switchLanguageLabel => 'नेपाली';

  @override
  String get errorNetwork => 'Can\'t reach the server. Check your internet connection and try again.';

  @override
  String get errorTimeout => 'The server took too long to answer. Please try again.';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get languageNepali => 'नेपाली';

  @override
  String get languageEnglish => 'English';

  @override
  String get invalidPhone => 'Enter a 10-digit mobile number.';

  @override
  String get adminUseWeb => 'Admins use the web dashboard.';

  @override
  String get retry => 'Try again';

  @override
  String get editDetails => 'Edit my details';

  @override
  String get open => 'Open';

  @override
  String youEarn(String amount) {
    return 'You earn $amount';
  }

  @override
  String feeNote(String fee) {
    return 'after Tolely fee $fee';
  }

  @override
  String get owedToTolely => 'Owed to Tolely';

  @override
  String get owedHelp => 'Customers pay you directly. Tolely\'s fee on those jobs is paid to Tolely.';

  @override
  String get supplierNew => 'New supplier';

  @override
  String jobsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(count, locale: localeName, other: '$count jobs', one: '1 job');
    return '$_temp0';
  }

  @override
  String get today => 'Today';

  @override
  String get tomorrow => 'Tomorrow';

  @override
  String get otherDate => 'Other date';

  @override
  String get asap => 'As soon as possible';

  @override
  String get noSlotsToday => 'No time left today. Please pick another day.';

  @override
  String get chooseTime => 'Choose a time';

  @override
  String get contactTitle => 'Who should the supplier contact?';

  @override
  String get contactName => 'Contact person';

  @override
  String get contactPhone => 'Contact phone';

  @override
  String get contactHint => 'The supplier will call this number. Use another person\'s if you won\'t be home.';

  @override
  String get contactInvalid => 'Enter a phone number with 8 to 10 digits.';

  @override
  String get timeExpired => 'That time has passed. Please choose again.';

  @override
  String get voiceTitle => 'Book by voice';

  @override
  String get voiceHint => 'Say what you need, e.g. “plumber chaiyo aaja nai”';

  @override
  String get voicePlaceholder => 'Or type it here';

  @override
  String get voiceListening => 'Listening… speak now';

  @override
  String get voiceThinking => 'Understanding…';

  @override
  String get voiceNotHeard => 'I didn\'t catch that. Tap the mic and try again, or type it.';

  @override
  String get micBlocked => 'Voice is not available. Allow the microphone in Settings, or type instead.';

  @override
  String get voiceReady => 'Check the details and confirm';

  @override
  String get voiceSend => 'Understand';

  @override
  String get voiceTapToSpeak => 'Tap to speak';

  @override
  String get searchPlace => 'Search a place, e.g. Balkot Chowk';

  @override
  String get searchByVoice => 'Say the place';

  @override
  String get noPlaces => 'No place found. Try another spelling, or move the map.';
}
