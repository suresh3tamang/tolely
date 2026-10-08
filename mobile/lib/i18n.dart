import 'package:flutter/foundation.dart';

/// Current language: 'ne' (Nepali, default) or 'en'.
final language = ValueNotifier<String>('ne');

bool get isNepali => language.value == 'ne';

const _strings = <String, Map<String, String>>{
  'appName': {'en': 'Tolely', 'ne': 'टोलेली'},
  'phoneTitle': {'en': 'Enter your mobile number', 'ne': 'आफ्नो मोबाइल नम्बर लेख्नुहोस्'},
  'phoneHint': {'en': '98XXXXXXXX', 'ne': '९८XXXXXXXX'},
  'sendCode': {'en': 'Send code', 'ne': 'कोड पठाउनुहोस्'},
  'otpTitle': {'en': 'Enter the 6-digit code', 'ne': '६ अंकको कोड लेख्नुहोस्'},
  'verify': {'en': 'Verify', 'ne': 'पुष्टि गर्नुहोस्'},
  'welcome': {'en': 'Welcome! How will you use Tolely?', 'ne': 'स्वागत छ! तपाईं कसरी प्रयोग गर्नुहुन्छ?'},
  'iNeedService': {'en': 'I need a service', 'ne': 'मलाई सेवा चाहियो'},
  'iProvideService': {'en': 'I provide a service', 'ne': 'म सेवा दिन्छु'},
  'name': {'en': 'Your name', 'ne': 'तपाईंको नाम'},
  'address': {'en': 'Address (tole, ward)', 'ne': 'ठेगाना (टोल, वडा)'},
  'landmark': {'en': 'Landmark (e.g. near Shiva temple, blue gate)', 'ne': 'चिनारी (जस्तै: शिव मन्दिर नजिक, निलो गेट)'},
  'workArea': {'en': 'Area you work in', 'ne': 'काम गर्ने क्षेत्र'},
  'servicesYouOffer': {'en': 'Services you offer', 'ne': 'तपाईंले दिने सेवाहरू'},
  'vehicleNo': {'en': 'Tanker vehicle number', 'ne': 'ट्याङ्कर गाडी नम्बर'},
  'waterSource': {'en': 'Water source (where you fill)', 'ne': 'पानीको स्रोत (कहाँबाट भर्नुहुन्छ)'},
  'save': {'en': 'Save', 'ne': 'सेभ गर्नुहोस्'},
  'home': {'en': 'Home', 'ne': 'गृह'},
  'myBookings': {'en': 'My bookings', 'ne': 'मेरा बुकिङ'},
  'whatDoYouNeed': {'en': 'What do you need today?', 'ne': 'आज के चाहियो?'},
  'chooseOption': {'en': 'Choose size / type', 'ne': 'साइज / प्रकार छान्नुहोस्'},
  'when': {'en': 'When?', 'ne': 'कहिले?'},
  'payment': {'en': 'Payment', 'ne': 'भुक्तानी'},
  'cash': {'en': 'Cash', 'ne': 'नगद'},
  'qr': {'en': 'eSewa / Khalti QR', 'ne': 'eSewa / Khalti QR'},
  'note': {'en': 'Note for supplier (optional)', 'ne': 'सप्लायरलाई नोट (ऐच्छिक)'},
  'confirmBooking': {'en': 'Confirm booking', 'ne': 'बुकिङ पक्का गर्नुहोस्'},
  'booked': {'en': 'Booked! We will notify you when a supplier accepts.', 'ne': 'बुक भयो! सप्लायरले स्वीकार गरेपछि जानकारी दिइनेछ।'},
  'noBookings': {'en': 'No bookings yet', 'ne': 'अहिलेसम्म बुकिङ छैन'},
  'cancel': {'en': 'Cancel', 'ne': 'रद्द गर्नुहोस्'},
  'call': {'en': 'Call', 'ne': 'फोन गर्नुहोस्'},
  'rate': {'en': 'Rate this service', 'ne': 'सेवाको मूल्याङ्कन गर्नुहोस्'},
  'thanksRating': {'en': 'Thanks for rating!', 'ne': 'मूल्याङ्कनको लागि धन्यवाद!'},
  'status_pending': {'en': 'Finding supplier', 'ne': 'सप्लायर खोज्दै'},
  'status_accepted': {'en': 'Accepted', 'ne': 'स्वीकार भयो'},
  'status_on_the_way': {'en': 'On the way', 'ne': 'बाटोमा छ'},
  'status_completed': {'en': 'Completed', 'ne': 'सम्पन्न'},
  'status_cancelled': {'en': 'Cancelled', 'ne': 'रद्द'},
  'availableJobs': {'en': 'Available jobs', 'ne': 'उपलब्ध काम'},
  'myJobs': {'en': 'My jobs', 'ne': 'मेरा काम'},
  'notVerified': {
    'en': 'Your account is waiting for verification. Our team will call you soon.',
    'ne': 'तपाईंको खाता प्रमाणीकरण हुँदैछ। हाम्रो टोलीले छिट्टै फोन गर्नेछ।',
  },
  'accept': {'en': 'Accept job', 'ne': 'काम लिनुहोस्'},
  'startTrip': {'en': 'I am on the way', 'ne': 'म बाटोमा छु'},
  'markDone': {'en': 'Mark completed', 'ne': 'सम्पन्न भयो'},
  'release': {'en': 'Release job', 'ne': 'काम छोड्नुहोस्'},
  'noJobs': {'en': 'No jobs right now', 'ne': 'अहिले कुनै काम छैन'},
  'logout': {'en': 'Log out', 'ne': 'लगआउट'},
  'required': {'en': 'Required', 'ne': 'आवश्यक छ'},
};

/// Translate a key into the current language.
String tr(String key) => _strings[key]?[language.value] ?? key;
