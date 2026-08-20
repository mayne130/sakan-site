// ─────────────────────────────────────────────────────────────
// Sakan i18n: English / Arabic
// This file only translates the APP'S OWN interface (buttons,
// labels, menus, static page content). It does NOT translate
// user-submitted content — listing titles/descriptions, chat
// messages, or names — since that would require a live machine
// translation service, a separate feature. Owners and seekers
// still type and read those in whatever language they use.
// ─────────────────────────────────────────────────────────────

export const translations = {
  en: {
    // Nav
    nav_browse: "Browse Rooms",
    nav_how: "How it works",
    nav_list: "List your place",
    nav_safety: "Safety Guide",
    nav_movein: "Move-in Checklist",
    nav_about: "About",
    nav_privacy: "Privacy",
    nav_contact: "Contact Us",
    nav_signin: "Sign in",
    nav_signout: "Sign out",
    nav_mylistings: "My listings",
    nav_admin: "Admin",
    nav_accounts: "Accounts",
    nav_post: "+ Post a listing",
    download_app: "📲 Download App",

    // Hero
    hero_eyebrow: "Built for Kuwait's expat community",
    hero_h1_1: "Find a room, partition,",
    hero_h1_2: "or flat — ",
    hero_h1_em: "a key you can trust.",
    hero_sub: "Browse real listings, message owners directly, and settle in faster. No agents, no runaround.",
    hero_area_label: "Area",
    hero_area_any: "Any area in Kuwait",
    hero_type_label: "Type",
    hero_type_any: "Any type",
    hero_budget_label: "Max budget (KD)",
    hero_search: "Search",
    hero_stat_listings: "Active listings",
    hero_stat_areas: "Areas covered",
    hero_stat_free: "To browse & chat",

    // Browse section
    browse_h2: "Available now",
    browse_sub: "Tap any listing to see photos, details, and message the owner.",
    filter_all: "All",
    filter_partitions: "Partitions",
    filter_studios: "Studios",
    filter_1br: "1BR",
    filter_2br: "2BR+",
    filter_family: "Family only",
    filter_bachelors: "Bachelors only",
    filter_halal: "🍽️ Halal food nearby",
    filter_prayer: "🕌 Prayer room",
    filter_transport: "🚌 Near transport",
    filter_furnished: "🛋️ Furnished",
    filter_monthly: "📅 Monthly lease",
    no_listings_match: "No listings match those filters yet — try clearing one.",
    fast_responder: "⚡ Fast responder",
    verified_owner: "✅ Verified owner",

    // How it works
    how_h2: "How Sakan works",
    how_sub: "Three steps, no middlemen fees for seekers.",
    how1_num: "01 / SEARCH",
    how1_h3: "Filter by area & budget",
    how1_p: "Narrow down partitions, studios, or flats by location, price, and who they're suited for.",
    how2_num: "02 / CHAT",
    how2_h3: "Message the owner directly",
    how2_p: "No calls to strangers. Chat in-app first, share contact details only when you're ready.",
    how3_num: "03 / MOVE IN",
    how3_h3: "Confirm and settle in",
    how3_p: "Agree on terms directly with the owner. Sakan just gets you talking faster.",

    // Owner CTA
    owner_h2: "Have a place to rent out?",
    owner_p: "Post your first listing free. From your second on, it's 2 KD per post via WAMD or Pay Link. Every listing is quickly ID-verified before it goes live, so seekers can trust what they see.",
    owner_note: "📱 Before your listing goes live, we'll confirm your WhatsApp number is real and reachable — quick and simple, no documents needed.",
    owner_tier1_name: "First listing",
    owner_tier1_price: "Free",
    owner_tier1_desc: "Published instantly",
    owner_tier2_name: "Each listing after",
    owner_tier2_price: "2 KD",
    owner_tier2_desc: "Pay via WAMD/Pay Link, then approved",
    owner_cta_btn: "Post a listing →",

    footer_text: "Sakan · Built for Kuwait's expat community",

    // Auth modal
    auth_title: "Sign in to Sakan",
    auth_mode_label: "I want to",
    auth_mode_login: "Sign in",
    auth_mode_signup: "Create an account",
    auth_role_label: "I'm signing up as a",
    auth_role_seeker: "Room seeker (browsing/looking for a place)",
    auth_role_owner: "House owner (listing a place to rent)",
    auth_name_label: "Name (for new accounts)",
    auth_email_label: "Email",
    auth_password_label: "Password",
    auth_forgot: "Forgot your password?",
    auth_continue: "Continue",
    verify_title: "Verify your email",
    verify_code_label: "Verification code",
    verify_btn: "Verify & create account",
    verify_resend_q: "Didn't get it?",
    verify_resend: "Resend code",

    // Post listing form
    post_title_new: "Post your listing",
    post_sub_new: "Your first listing is free. From your second on, publishing costs 2 KD via WAMD/Pay Link. Every listing — including your first — is quickly verified before it goes live to keep Sakan scam-free.",
    post_title_edit: "Edit your listing",
    f_title: "Title",
    f_title_ph: "e.g. Partition for bachelors, Salmiya",
    f_area: "Area",
    f_area_ph: "e.g. Salmiya",
    f_type: "Type",
    f_price: "Monthly rent (KD)",
    f_price_ph: "e.g. 65",
    f_forwho: "Suited for",
    f_phone: "Your phone or WhatsApp",
    f_phone_ph: "Only shared after you approve chat",
    f_lease: "Lease length",
    f_lang: "Languages you speak (helps expats know they can communicate easily)",
    f_amenities: "Nearby / building amenities",
    f_desc: "Description",
    f_desc_ph: "AC, furnishing, distance to metro/bus, included bills, etc.",
    f_photo: "Photo of the property",
    lang_arabic: "Arabic", lang_english: "English", lang_hindi: "Hindi", lang_urdu: "Urdu",
    lang_tagalog: "Tagalog", lang_malayalam: "Malayalam", lang_bengali: "Bengali",
    filter_halal_plain: "Halal food nearby", filter_furnished_plain: "Furnished",
    amenity_prayer: "Prayer room in building", amenity_transport: "Public transport nearby",
    amenity_family: "Family-friendly building",
    submit_publish: "Publish listing",
    submit_save: "Save changes",

    // Listing detail modal
    msg_owner: "Message owner",
    chat_with_owner: "💬 Chat with owner",
    replies_within: "Usually replies within a few hours",
    safety_note: "🛡️ Stay safe: view the property in person before paying any deposit, and confirm the owner's ID matches the property's documents. Never send money to someone you haven't met or verified.",
    report_listing: "Report this listing",

    // Chat
    quick_available: "Yes, still available ✅",
    quick_rented: "Sorry, already rented ❌",
    quick_bachelors: "Bachelors welcome",
    quick_movein: "What's your move-in date?",
    share_number: "Share my number",
    chat_placeholder: "Type a message...",
    send: "Send",
    seen: "Seen",
    seeker_label: "Seeker",
    phone_shared: "Owner shared their number",

    // Payment modal
    pay_title: "Pay to publish",
    pay_amount: "Amount",
    pay_send_via: "Send via WAMD / Pay Link to",
    pay_note: "Once you've sent payment, tap the button below. Sakan Customer Care will confirm it and your listing goes live shortly after.",
    pay_confirm_btn: "I've paid — notify Sakan",

    // My listings
    mylistings_title: "My listings",
    no_listings_yet: "You haven't posted any listings yet.",
    edit_rephoto: "Edit / re-photo",
    pay_to_publish: "Pay {fee} KD to publish",
    resubmit_payment: "Resubmit payment",
    deactivate: "Deactivate",
    status_live: "Live",
    status_payment_needed: "Payment needed",
    status_awaiting: "Awaiting approval",
    status_rejected: "Not approved",
    status_deactivated: "Deactivated",
    invite_friends: "🎁 Invite friends to Sakan",
    copy_link: "Copy link",

    // Notifications / Admin
    notif_title: "Notifications",
    no_new_notifications: "No new notifications.",
    wants_to_chat: "wants to chat",
    referral_joined: "{count} friends joined using your link so far!",
    referral_share: "Share your link — friends who sign up through it count toward your invites.",
    referral_unavailable: "Referral info unavailable right now.",
    admin_title: "Admin",
    no_pending: "No pending approvals.",
    approve: "Approve post",
    dont_publish: "Don't publish",
    view_id_photo: "View Civil ID photo",
    no_id_uploaded: "No ID photo uploaded",
    manage_accounts_title: "Manage accounts",
    manage_accounts_sub: "Deleting an account removes their profile and all their listings from Sakan. This doesn't delete their login itself.",
    delete: "Delete",
    you_label: "(you)",

    // Language toggle
    lang_toggle: "العربية",

    // Enum display values (underlying stored value stays English)
    type_partition: "Partition", type_studio: "Studio", type_1br: "1BR Apartment",
    type_2br: "2BR+ Apartment", type_shared: "Shared Room",
    forwho_bachelors: "Bachelors", forwho_family: "Family", forwho_either: "Either",
    lease_monthly: "Monthly", lease_flexible: "Flexible",
    lease_short: "Short-term (1-6 months)", lease_long: "Long-term (6+ months)"
  },

  ar: {
    nav_browse: "تصفّح الغرف",
    nav_how: "كيف يعمل",
    nav_list: "أضف عقارك",
    nav_safety: "دليل الأمان",
    nav_movein: "قائمة الانتقال",
    nav_about: "من نحن",
    nav_privacy: "الخصوصية",
    nav_contact: "تواصل معنا",
    nav_signin: "تسجيل الدخول",
    nav_signout: "تسجيل الخروج",
    nav_mylistings: "إعلاناتي",
    nav_admin: "الإدارة",
    nav_accounts: "الحسابات",
    nav_post: "+ أضف إعلانًا",
    download_app: "📲 تحميل التطبيق",

    hero_eyebrow: "مصمم لمجتمع المقيمين في الكويت",
    hero_h1_1: "ابحث عن غرفة أو بارتيشن",
    hero_h1_2: "أو شقة — ",
    hero_h1_em: "مفتاح يمكنك الوثوق به.",
    hero_sub: "تصفّح إعلانات حقيقية، وتواصل مباشرة مع الملاك، واستقر بشكل أسرع. بدون وسطاء وبدون تعقيد.",
    hero_area_label: "المنطقة",
    hero_area_any: "أي منطقة في الكويت",
    hero_type_label: "النوع",
    hero_type_any: "أي نوع",
    hero_budget_label: "الميزانية القصوى (د.ك)",
    hero_search: "بحث",
    hero_stat_listings: "إعلانات نشطة",
    hero_stat_areas: "مناطق مغطاة",
    hero_stat_free: "للتصفح والمحادثة",

    browse_h2: "متاح الآن",
    browse_sub: "اضغط على أي إعلان لرؤية الصور والتفاصيل ومراسلة المالك.",
    filter_all: "الكل",
    filter_partitions: "بارتيشن",
    filter_studios: "استوديو",
    filter_1br: "غرفة نوم واحدة",
    filter_2br: "غرفتا نوم فأكثر",
    filter_family: "للعائلات فقط",
    filter_bachelors: "للعزاب فقط",
    filter_halal: "🍽️ طعام حلال قريب",
    filter_prayer: "🕌 مصلى",
    filter_transport: "🚌 قريب من المواصلات",
    filter_furnished: "🛋️ مفروش",
    filter_monthly: "📅 إيجار شهري",
    no_listings_match: "لا توجد إعلانات مطابقة لهذه الفلاتر — جرّب إزالة أحدها.",
    fast_responder: "⚡ يرد بسرعة",
    verified_owner: "✅ مالك موثّق",

    how_h2: "كيف يعمل سكن",
    how_sub: "ثلاث خطوات، بدون رسوم وسطاء للباحثين عن سكن.",
    how1_num: "٠١ / البحث",
    how1_h3: "فلترة حسب المنطقة والميزانية",
    how1_p: "حدد البارتيشن أو الاستوديو أو الشقة حسب الموقع والسعر والفئة المناسبة.",
    how2_num: "٠٢ / المحادثة",
    how2_h3: "راسل المالك مباشرة",
    how2_p: "بدون اتصال بغرباء. تحدث داخل التطبيق أولًا، وشارك معلومات التواصل عندما تكون جاهزًا.",
    how3_num: "٠٣ / الانتقال",
    how3_h3: "اتفق واستقر",
    how3_p: "اتفق على الشروط مباشرة مع المالك. سكن يساعدك فقط على التواصل بشكل أسرع.",

    owner_h2: "لديك عقار للإيجار؟",
    owner_p: "انشر إعلانك الأول مجانًا. من الإعلان الثاني، الرسوم 2 دينار كويتي عبر واياك (WAMD) أو رابط الدفع. يتم التحقق من كل إعلان بسرعة قبل نشره حتى يثق به الباحثون.",
    owner_note: "📱 قبل نشر إعلانك، سنتأكد من أن رقم واتسابك حقيقي ويمكن الوصول إليه — بسيط وسريع، بدون مستندات.",
    owner_tier1_name: "الإعلان الأول",
    owner_tier1_price: "مجاني",
    owner_tier1_desc: "يُنشر فورًا",
    owner_tier2_name: "كل إعلان لاحق",
    owner_tier2_price: "2 د.ك",
    owner_tier2_desc: "ادفع عبر واياك أو رابط الدفع، ثم تتم الموافقة",
    owner_cta_btn: "أضف إعلانًا ←",

    footer_text: "سكن · مصمم لمجتمع المقيمين في الكويت",

    auth_title: "تسجيل الدخول إلى سكن",
    auth_mode_label: "أريد",
    auth_mode_login: "تسجيل الدخول",
    auth_mode_signup: "إنشاء حساب",
    auth_role_label: "أسجل كـ",
    auth_role_seeker: "باحث عن سكن (تصفح/بحث عن مكان)",
    auth_role_owner: "مالك عقار (لإعلان مكان للإيجار)",
    auth_name_label: "الاسم (للحسابات الجديدة)",
    auth_email_label: "البريد الإلكتروني",
    auth_password_label: "كلمة المرور",
    auth_forgot: "هل نسيت كلمة المرور؟",
    auth_continue: "متابعة",
    verify_title: "تحقق من بريدك الإلكتروني",
    verify_code_label: "رمز التحقق",
    verify_btn: "تحقق وأنشئ الحساب",
    verify_resend_q: "لم يصلك الرمز؟",
    verify_resend: "إعادة إرسال الرمز",

    post_title_new: "أضف إعلانك",
    post_sub_new: "إعلانك الأول مجاني. من الإعلان الثاني، تكلفة النشر 2 د.ك عبر واياك أو رابط الدفع. يتم التحقق من كل إعلان — بما في ذلك الأول — بسرعة قبل نشره للحفاظ على سكن خاليًا من الاحتيال.",
    post_title_edit: "تعديل إعلانك",
    f_title: "العنوان",
    f_title_ph: "مثال: بارتيشن للعزاب، السالمية",
    f_area: "المنطقة",
    f_area_ph: "مثال: السالمية",
    f_type: "النوع",
    f_price: "الإيجار الشهري (د.ك)",
    f_price_ph: "مثال: 65",
    f_forwho: "مناسب لـ",
    f_phone: "رقم هاتفك أو واتساب",
    f_phone_ph: "يُشارك فقط بعد موافقتك على المحادثة",
    f_lease: "مدة الإيجار",
    f_lang: "اللغات التي تتحدثها (تساعد المقيمين على التواصل بسهولة)",
    f_amenities: "المرافق القريبة / في المبنى",
    f_desc: "الوصف",
    f_desc_ph: "التكييف، الفرش، المسافة إلى المترو/الباص، الفواتير المشمولة، إلخ.",
    f_photo: "صورة العقار",
    lang_arabic: "العربية", lang_english: "الإنجليزية", lang_hindi: "الهندية", lang_urdu: "الأوردية",
    lang_tagalog: "التاغالوغ", lang_malayalam: "المالايالامية", lang_bengali: "البنغالية",
    filter_halal_plain: "طعام حلال قريب", filter_furnished_plain: "مفروش",
    amenity_prayer: "مصلى في المبنى", amenity_transport: "قريب من المواصلات العامة",
    amenity_family: "مبنى مناسب للعائلات",
    submit_publish: "نشر الإعلان",
    submit_save: "حفظ التغييرات",

    msg_owner: "راسل المالك",
    chat_with_owner: "💬 تحدث مع المالك",
    replies_within: "عادة يرد خلال ساعات قليلة",
    safety_note: "🛡️ حافظ على سلامتك: عاين العقار شخصيًا قبل دفع أي عربون، وتأكد من تطابق هوية المالك مع مستندات العقار. لا ترسل أموالًا لشخص لم تقابله أو تتحقق منه.",
    report_listing: "الإبلاغ عن هذا الإعلان",

    quick_available: "نعم، ما زال متاحًا ✅",
    quick_rented: "عذرًا، تم تأجيره بالفعل ❌",
    quick_bachelors: "العزاب مرحب بهم",
    quick_movein: "ما هو تاريخ انتقالك؟",
    share_number: "شارك رقمي",
    chat_placeholder: "اكتب رسالة...",
    send: "إرسال",
    seen: "تمت المشاهدة",
    seeker_label: "الباحث عن سكن",
    phone_shared: "شارك المالك رقمه",

    pay_title: "ادفع للنشر",
    pay_amount: "المبلغ",
    pay_send_via: "أرسل عبر واياك / رابط الدفع إلى",
    pay_note: "بعد إرسال الدفع، اضغط الزر أدناه. سيؤكد فريق خدمة عملاء سكن ذلك وسينشر إعلانك بعد فترة قصيرة.",
    pay_confirm_btn: "لقد دفعت — أبلغ سكن",

    mylistings_title: "إعلاناتي",
    no_listings_yet: "لم تنشر أي إعلانات بعد.",
    edit_rephoto: "تعديل / تغيير الصورة",
    pay_to_publish: "ادفع {fee} د.ك للنشر",
    resubmit_payment: "إعادة إرسال الدفع",
    deactivate: "إلغاء التنشيط",
    status_live: "منشور",
    status_payment_needed: "بحاجة للدفع",
    status_awaiting: "بانتظار الموافقة",
    status_rejected: "لم تتم الموافقة",
    status_deactivated: "غير نشط",
    invite_friends: "🎁 ادعُ أصدقاءك إلى سكن",
    copy_link: "نسخ الرابط",

    notif_title: "الإشعارات",
    no_new_notifications: "لا توجد إشعارات جديدة.",
    wants_to_chat: "يريد التحدث",
    referral_joined: "انضم {count} صديق باستخدام رابطك حتى الآن!",
    referral_share: "شارك رابطك — الأصدقاء الذين يسجلون من خلاله يُحتسبون ضمن دعواتك.",
    referral_unavailable: "معلومات الدعوات غير متاحة حاليًا.",
    admin_title: "الإدارة",
    no_pending: "لا توجد طلبات بانتظار الموافقة.",
    approve: "الموافقة على النشر",
    dont_publish: "عدم النشر",
    view_id_photo: "عرض صورة البطاقة المدنية",
    no_id_uploaded: "لم يتم رفع صورة الهوية",
    manage_accounts_title: "إدارة الحسابات",
    manage_accounts_sub: "حذف الحساب يزيل ملفه الشخصي وجميع إعلاناته من سكن. هذا لا يحذف حساب الدخول نفسه.",
    delete: "حذف",
    you_label: "(أنت)",

    lang_toggle: "English",

    type_partition: "بارتيشن", type_studio: "استوديو", type_1br: "غرفة نوم واحدة",
    type_2br: "غرفتا نوم فأكثر", type_shared: "غرفة مشتركة",
    forwho_bachelors: "عزاب", forwho_family: "عائلات", forwho_either: "الجميع",
    lease_monthly: "شهري", lease_flexible: "مرن",
    lease_short: "قصير المدى (1-6 أشهر)", lease_long: "طويل المدى (6+ أشهر)"
  }
};

let currentLang = localStorage.getItem('sakanLang') || 'en';

export function getLang() {
  return currentLang;
}

export function t(key, vars) {
  let str = (translations[currentLang] && translations[currentLang][key]) || translations.en[key] || key;
  if (vars) {
    Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
  }
  return str;
}

// Applies translations to every element in the DOM tagged with
// data-i18n (text content) or data-i18n-ph (placeholder text).
export function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
  });

  const toggleBtn = document.getElementById('langToggleBtn');
  if (toggleBtn) toggleBtn.textContent = t('lang_toggle');
}

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('sakanLang', lang);
  applyTranslations();
  // Let app.js know so it can re-render dynamic content (cards, chat, etc.)
  window.dispatchEvent(new CustomEvent('sakan-lang-changed'));
}

window.toggleLanguage = () => setLanguage(currentLang === 'en' ? 'ar' : 'en');
