import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ne.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en'), Locale('ne')];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Tolely'**
  String get appName;

  /// No description provided for @phoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your mobile number'**
  String get phoneTitle;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'98XXXXXXXX'**
  String get phoneHint;

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @otpTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code'**
  String get otpTitle;

  /// No description provided for @verify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verify;

  /// No description provided for @welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome! How will you use Tolely?'**
  String get welcome;

  /// No description provided for @iNeedService.
  ///
  /// In en, this message translates to:
  /// **'I need a service'**
  String get iNeedService;

  /// No description provided for @iProvideService.
  ///
  /// In en, this message translates to:
  /// **'I provide a service'**
  String get iProvideService;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get name;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address (tole, ward)'**
  String get address;

  /// No description provided for @landmark.
  ///
  /// In en, this message translates to:
  /// **'Landmark (e.g. near Shiva temple, blue gate)'**
  String get landmark;

  /// No description provided for @workArea.
  ///
  /// In en, this message translates to:
  /// **'Area you work in'**
  String get workArea;

  /// No description provided for @servicesYouOffer.
  ///
  /// In en, this message translates to:
  /// **'Services you offer'**
  String get servicesYouOffer;

  /// No description provided for @vehicleNo.
  ///
  /// In en, this message translates to:
  /// **'Tanker vehicle number'**
  String get vehicleNo;

  /// No description provided for @waterSource.
  ///
  /// In en, this message translates to:
  /// **'Water source (where you fill)'**
  String get waterSource;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @home.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get home;

  /// No description provided for @myBookings.
  ///
  /// In en, this message translates to:
  /// **'My bookings'**
  String get myBookings;

  /// No description provided for @whatDoYouNeed.
  ///
  /// In en, this message translates to:
  /// **'What do you need today?'**
  String get whatDoYouNeed;

  /// No description provided for @chooseOption.
  ///
  /// In en, this message translates to:
  /// **'Choose size / type'**
  String get chooseOption;

  /// No description provided for @when.
  ///
  /// In en, this message translates to:
  /// **'When?'**
  String get when;

  /// No description provided for @payment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get payment;

  /// No description provided for @cash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get cash;

  /// No description provided for @qr.
  ///
  /// In en, this message translates to:
  /// **'eSewa / Khalti QR'**
  String get qr;

  /// No description provided for @note.
  ///
  /// In en, this message translates to:
  /// **'Note for supplier (optional)'**
  String get note;

  /// No description provided for @confirmBooking.
  ///
  /// In en, this message translates to:
  /// **'Confirm booking'**
  String get confirmBooking;

  /// No description provided for @booked.
  ///
  /// In en, this message translates to:
  /// **'Booked! We will notify you when a supplier accepts.'**
  String get booked;

  /// No description provided for @noBookings.
  ///
  /// In en, this message translates to:
  /// **'No bookings yet'**
  String get noBookings;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @call.
  ///
  /// In en, this message translates to:
  /// **'Call'**
  String get call;

  /// No description provided for @rate.
  ///
  /// In en, this message translates to:
  /// **'Rate this service'**
  String get rate;

  /// No description provided for @thanksRating.
  ///
  /// In en, this message translates to:
  /// **'Thanks for rating!'**
  String get thanksRating;

  /// No description provided for @statusPending.
  ///
  /// In en, this message translates to:
  /// **'Finding supplier'**
  String get statusPending;

  /// No description provided for @statusAccepted.
  ///
  /// In en, this message translates to:
  /// **'Accepted'**
  String get statusAccepted;

  /// No description provided for @statusOnTheWay.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get statusOnTheWay;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCancelled;

  /// No description provided for @availableJobs.
  ///
  /// In en, this message translates to:
  /// **'Available jobs'**
  String get availableJobs;

  /// No description provided for @myJobs.
  ///
  /// In en, this message translates to:
  /// **'My jobs'**
  String get myJobs;

  /// No description provided for @notVerified.
  ///
  /// In en, this message translates to:
  /// **'Your account is waiting for verification. Our team will call you soon.'**
  String get notVerified;

  /// No description provided for @accept.
  ///
  /// In en, this message translates to:
  /// **'Accept job'**
  String get accept;

  /// No description provided for @startTrip.
  ///
  /// In en, this message translates to:
  /// **'I am on the way'**
  String get startTrip;

  /// No description provided for @markDone.
  ///
  /// In en, this message translates to:
  /// **'Mark completed'**
  String get markDone;

  /// No description provided for @release.
  ///
  /// In en, this message translates to:
  /// **'Release job'**
  String get release;

  /// No description provided for @noJobs.
  ///
  /// In en, this message translates to:
  /// **'No jobs right now'**
  String get noJobs;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logout;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @me.
  ///
  /// In en, this message translates to:
  /// **'Me'**
  String get me;

  /// No description provided for @languageLabel.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get languageLabel;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteAccount;

  /// No description provided for @deleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete your account permanently? Your past bookings stay in our records.'**
  String get deleteConfirm;

  /// No description provided for @supplierEditWarning.
  ///
  /// In en, this message translates to:
  /// **'Changing your details sends your account for verification again.'**
  String get supplierEditWarning;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Booking details'**
  String get details;

  /// No description provided for @stepBooked.
  ///
  /// In en, this message translates to:
  /// **'Booked'**
  String get stepBooked;

  /// No description provided for @stepAccepted.
  ///
  /// In en, this message translates to:
  /// **'Supplier accepted'**
  String get stepAccepted;

  /// No description provided for @stepOnTheWay.
  ///
  /// In en, this message translates to:
  /// **'On the way'**
  String get stepOnTheWay;

  /// No description provided for @stepCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get stepCompleted;

  /// No description provided for @stepCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get stepCancelled;

  /// No description provided for @reportProblem.
  ///
  /// In en, this message translates to:
  /// **'Report a problem'**
  String get reportProblem;

  /// No description provided for @reportHint.
  ///
  /// In en, this message translates to:
  /// **'What went wrong?'**
  String get reportHint;

  /// No description provided for @reportSent.
  ///
  /// In en, this message translates to:
  /// **'Thanks. Our team will contact you.'**
  String get reportSent;

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @completedJobs.
  ///
  /// In en, this message translates to:
  /// **'Jobs done'**
  String get completedJobs;

  /// No description provided for @ratingLabel.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get ratingLabel;

  /// No description provided for @earnedThisMonth.
  ///
  /// In en, this message translates to:
  /// **'Earned this month'**
  String get earnedThisMonth;

  /// No description provided for @earnedTotal.
  ///
  /// In en, this message translates to:
  /// **'Earned (last 100 jobs)'**
  String get earnedTotal;

  /// No description provided for @verifiedBadge.
  ///
  /// In en, this message translates to:
  /// **'Verified supplier'**
  String get verifiedBadge;

  /// No description provided for @scheduled.
  ///
  /// In en, this message translates to:
  /// **'Scheduled'**
  String get scheduled;

  /// No description provided for @customer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get customer;

  /// No description provided for @supplier.
  ///
  /// In en, this message translates to:
  /// **'Supplier'**
  String get supplier;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get confirm;

  /// No description provided for @pinLocation.
  ///
  /// In en, this message translates to:
  /// **'Pin your location'**
  String get pinLocation;

  /// No description provided for @pinHelp.
  ///
  /// In en, this message translates to:
  /// **'Move the map so the pin is on your house'**
  String get pinHelp;

  /// No description provided for @confirmLocation.
  ///
  /// In en, this message translates to:
  /// **'Use this location'**
  String get confirmLocation;

  /// No description provided for @locationOff.
  ///
  /// In en, this message translates to:
  /// **'Could not get your location. Move the map by hand.'**
  String get locationOff;

  /// No description provided for @locationPinned.
  ///
  /// In en, this message translates to:
  /// **'Location pinned on map'**
  String get locationPinned;

  /// No description provided for @addMapPin.
  ///
  /// In en, this message translates to:
  /// **'Pin location on map (helps the supplier find you)'**
  String get addMapPin;

  /// No description provided for @directions.
  ///
  /// In en, this message translates to:
  /// **'Directions'**
  String get directions;

  /// No description provided for @liveTracking.
  ///
  /// In en, this message translates to:
  /// **'Live location of your supplier'**
  String get liveTracking;

  /// No description provided for @online.
  ///
  /// In en, this message translates to:
  /// **'Online'**
  String get online;

  /// No description provided for @offline.
  ///
  /// In en, this message translates to:
  /// **'Offline'**
  String get offline;

  /// No description provided for @offlineHint.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Go online to get new job alerts.'**
  String get offlineHint;

  /// No description provided for @sharingLocation.
  ///
  /// In en, this message translates to:
  /// **'Sharing your location with the customer'**
  String get sharingLocation;

  /// No description provided for @bookAgain.
  ///
  /// In en, this message translates to:
  /// **'Book again'**
  String get bookAgain;

  /// No description provided for @tagline.
  ///
  /// In en, this message translates to:
  /// **'Trusted help from your own tole'**
  String get tagline;

  /// No description provided for @phoneHelp.
  ///
  /// In en, this message translates to:
  /// **'We\'ll send a 6-digit code to verify it\'s you.'**
  String get phoneHelp;

  /// No description provided for @otpHelp.
  ///
  /// In en, this message translates to:
  /// **'Enter the code we sent by SMS.'**
  String get otpHelp;

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get changeNumber;

  /// No description provided for @namaste.
  ///
  /// In en, this message translates to:
  /// **'Namaste'**
  String get namaste;

  /// No description provided for @tipTitle.
  ///
  /// In en, this message translates to:
  /// **'Clean your tank before monsoon'**
  String get tipTitle;

  /// No description provided for @tipBody.
  ///
  /// In en, this message translates to:
  /// **'Clean water starts with a clean tank. Book tank cleaning in a tap.'**
  String get tipBody;

  /// No description provided for @serviceUnavailable.
  ///
  /// In en, this message translates to:
  /// **'This service is not available right now.'**
  String get serviceUnavailable;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get back;

  /// Starting price shown on a service tile
  ///
  /// In en, this message translates to:
  /// **'From {amount}'**
  String fromPrice(String amount);

  /// No description provided for @switchLanguageLabel.
  ///
  /// In en, this message translates to:
  /// **'नेपाली'**
  String get switchLanguageLabel;

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'Can\'t reach the server. Check your internet connection and try again.'**
  String get errorNetwork;

  /// No description provided for @errorTimeout.
  ///
  /// In en, this message translates to:
  /// **'The server took too long to answer. Please try again.'**
  String get errorTimeout;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @languageNepali.
  ///
  /// In en, this message translates to:
  /// **'नेपाली'**
  String get languageNepali;

  /// No description provided for @languageEnglish.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get languageEnglish;

  /// No description provided for @invalidPhone.
  ///
  /// In en, this message translates to:
  /// **'Enter a 10-digit mobile number.'**
  String get invalidPhone;

  /// No description provided for @adminUseWeb.
  ///
  /// In en, this message translates to:
  /// **'Admins use the web dashboard.'**
  String get adminUseWeb;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @editDetails.
  ///
  /// In en, this message translates to:
  /// **'Edit my details'**
  String get editDetails;

  /// No description provided for @open.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get open;

  /// No description provided for @youEarn.
  ///
  /// In en, this message translates to:
  /// **'You earn {amount}'**
  String youEarn(String amount);

  /// No description provided for @feeNote.
  ///
  /// In en, this message translates to:
  /// **'after Tolely fee {fee}'**
  String feeNote(String fee);

  /// No description provided for @owedToTolely.
  ///
  /// In en, this message translates to:
  /// **'Owed to Tolely'**
  String get owedToTolely;

  /// No description provided for @owedHelp.
  ///
  /// In en, this message translates to:
  /// **'Customers pay you directly. Tolely\'s fee on those jobs is paid to Tolely.'**
  String get owedHelp;

  /// No description provided for @supplierNew.
  ///
  /// In en, this message translates to:
  /// **'New supplier'**
  String get supplierNew;

  /// No description provided for @jobsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 job} other{{count} jobs}}'**
  String jobsCount(int count);

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @tomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get tomorrow;

  /// No description provided for @otherDate.
  ///
  /// In en, this message translates to:
  /// **'Other date'**
  String get otherDate;

  /// No description provided for @asap.
  ///
  /// In en, this message translates to:
  /// **'As soon as possible'**
  String get asap;

  /// No description provided for @noSlotsToday.
  ///
  /// In en, this message translates to:
  /// **'No time left today. Please pick another day.'**
  String get noSlotsToday;

  /// No description provided for @chooseTime.
  ///
  /// In en, this message translates to:
  /// **'Choose a time'**
  String get chooseTime;

  /// No description provided for @contactTitle.
  ///
  /// In en, this message translates to:
  /// **'Who should the supplier contact?'**
  String get contactTitle;

  /// No description provided for @contactName.
  ///
  /// In en, this message translates to:
  /// **'Contact person'**
  String get contactName;

  /// No description provided for @contactPhone.
  ///
  /// In en, this message translates to:
  /// **'Contact phone'**
  String get contactPhone;

  /// No description provided for @contactHint.
  ///
  /// In en, this message translates to:
  /// **'The supplier will call this number. Use another person\'s if you won\'t be home.'**
  String get contactHint;

  /// No description provided for @contactInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a phone number with 8 to 10 digits.'**
  String get contactInvalid;

  /// No description provided for @timeExpired.
  ///
  /// In en, this message translates to:
  /// **'That time has passed. Please choose again.'**
  String get timeExpired;

  /// No description provided for @voiceTitle.
  ///
  /// In en, this message translates to:
  /// **'Book by voice'**
  String get voiceTitle;

  /// No description provided for @voiceHint.
  ///
  /// In en, this message translates to:
  /// **'Say what you need, e.g. “plumber chaiyo aaja nai”'**
  String get voiceHint;

  /// No description provided for @voicePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Or type it here'**
  String get voicePlaceholder;

  /// No description provided for @voiceListening.
  ///
  /// In en, this message translates to:
  /// **'Listening… speak now'**
  String get voiceListening;

  /// No description provided for @voiceThinking.
  ///
  /// In en, this message translates to:
  /// **'Understanding…'**
  String get voiceThinking;

  /// No description provided for @voiceNotHeard.
  ///
  /// In en, this message translates to:
  /// **'I didn\'t catch that. Tap the mic and try again, or type it.'**
  String get voiceNotHeard;

  /// No description provided for @micBlocked.
  ///
  /// In en, this message translates to:
  /// **'Voice is not available. Allow the microphone in Settings, or type instead.'**
  String get micBlocked;

  /// No description provided for @voiceReady.
  ///
  /// In en, this message translates to:
  /// **'Check the details and confirm'**
  String get voiceReady;

  /// No description provided for @voiceSend.
  ///
  /// In en, this message translates to:
  /// **'Understand'**
  String get voiceSend;

  /// No description provided for @voiceTapToSpeak.
  ///
  /// In en, this message translates to:
  /// **'Tap to speak'**
  String get voiceTapToSpeak;

  /// No description provided for @searchPlace.
  ///
  /// In en, this message translates to:
  /// **'Search a place, e.g. Balkot Chowk'**
  String get searchPlace;

  /// No description provided for @searchByVoice.
  ///
  /// In en, this message translates to:
  /// **'Say the place'**
  String get searchByVoice;

  /// No description provided for @noPlaces.
  ///
  /// In en, this message translates to:
  /// **'No place found. Try another spelling, or move the map.'**
  String get noPlaces;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en', 'ne'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ne':
      return AppLocalizationsNe();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
