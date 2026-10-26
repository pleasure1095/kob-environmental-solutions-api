//Base Roles
export const SUPER_ADMIN = "super admin";
export const ADMIN = "admin";
export const ADMINS = [ADMIN, SUPER_ADMIN];
export const WORKER = "worker";
export const STAFF = 'staff';
export const DRIVER = 'driver'
export const TUTOR = "tutor";
export const CUSTOMER = 'customer';

export const COMPANY = 'company';

export const MALE = "male";
export const FEMALE = "female";
export const GENDERS = [FEMALE, MALE];

export const USER_ACTIVE = "active";
export const USER_DISABLED = "disabled";
export const USER_ACCOUNT_STATUSES = [USER_ACTIVE, USER_DISABLED];


//Custom-types
export const CUSTOM_STRING = "custom string";
export const CUSTOM_NUMBER = "custom number";
export const CUSTOM_FILE = "custom file";
export const CUSTOM_IMAGE = "custom image";
export const CUSTOM_TYPES = [CUSTOM_STRING, CUSTOM_NUMBER, CUSTOM_FILE, CUSTOM_IMAGE];

//Resource-types
export const RESOURCE_USER = "resource user";
export const RESOURCE_ROLE = "resource role";
export const RESOURCES_TYPES = [RESOURCE_USER, RESOURCE_ROLE];

//pages
export const LOGIN_PAGE = "Login Page";
export const EMAIL_2FA_PAGE = "E-mail 2FA Page";
export const AUTHENTICATOR_2FA_PAGE = "Authenticator App 2FA Page";

//user-image
export const MAX_USER_IMG_SIZE = 10 * 1000 * 1024;

export const MAX_RENTAL_ITEM_ATTACHMENT_VIDEO_SIZE = 260 * 1000 * 1024;
export const MAX_RENTAL_ATTACHMENT_IMG_SIZE = 1000 * 1024;

//user-image error
export const FILE_TYPE_INVALID = 'file type invalied';
export const FILE_2_LARGE = 'file too large';
export const FILE_OK = 'file ok';

//OTP-types
export const EMAIL_OTP = "email otp";
export const AUTHENTICATOR_OTP = "authenticator OTP";
export const OTP_TYPES = [EMAIL_OTP, AUTHENTICATOR_OTP];

//email verification token-types
export const EMAIL_VERIFICATION_TOKEN = 'email verification token';
export const AUTHENTICATOR_SETUP_TOKEN = 'authenticator verification token';
export const PASSWORD_RESET_TOKEN = 'password reset verification token';
export const EMAIL_TOKEN_TYPES = [EMAIL_VERIFICATION_TOKEN, AUTHENTICATOR_SETUP_TOKEN, PASSWORD_RESET_TOKEN];

//actions
export const C = "create";
export const R = "read";        //retrieve
export const U = "update";
export const D = "delete";
export const CRUD = [C, R, U, D];

//payment-types
export const CREDIT_PAYMENT = 'credit payment';
export const GATEWAY_PAYMENT = 'online payment';
export const EXTERNAL_PAYMENT = 'bank transfer';
export const PAYMENT_TYPES = [CREDIT_PAYMENT, GATEWAY_PAYMENT, EXTERNAL_PAYMENT];

//payment-statuses
export const PAYMENT_PENDING = 'pending';
export const PAYMENT_COMPLETED = 'completed';
export const PAYMENT_CANCELED = 'canceled';
export const PAYMENT_STATUSES = [PAYMENT_PENDING, PAYMENT_COMPLETED, PAYMENT_CANCELED];


//Resources
export const ORDER = 'order';
export const RENTAL_TIME_FRAME_EXTENSION = 'rental time frame extension';
export const PAYMENT = 'payment';
export const SERVICE_PLAN = 'service plan';
export const SERVICE_PLAN_PERIOD = 'service plan period';

export const RESOURCES_PAYABLE_4 = [ORDER, RENTAL_TIME_FRAME_EXTENSION, SERVICE_PLAN, SERVICE_PLAN_PERIOD];


//Order Statuses
export const UNAPPROVED = 'unapproved';
export const APPROVED = 'approved';
export const DEPARTED = 'departed';
export const INITIALIZED = 'initialized';
export const COMPLETED = 'completed';
export const ORDER_STATUSES = [UNAPPROVED, APPROVED, DEPARTED, INITIALIZED, COMPLETED];


//OrderTimeStampExtension Statuses
export const RENTAL_TIME_FRAME_EXTENSION_STATUSES = [APPROVED, UNAPPROVED];

//RentalPackage status
export const AWAITING_APPROVAL = 'awaiting approval';
export const AWAITING_DELIVERY = 'awaiting delivery';
export const AWAITING_RETRIEVAL = 'awaiting retrieval';
export const IS_HISTORY = 'is history';
export const RENTAL_PACKAGE_STATUSES = [AWAITING_APPROVAL, AWAITING_DELIVERY, AWAITING_RETRIEVAL, IS_HISTORY];

export const SUCCESS = 'success';
export const WARNING = 'warning';
export const FAILURE = 'failure';

//status
export const ACTIVE = 'active';
export const DISABLED = 'disabled';
export const ACTIVITY_STATUSES = [ACTIVE, DISABLED];

export const ASC = 'ascending';
export const DESC = 'descending';
export const ORDER_DIRECTIONS = [ASC, DESC];

//Measurements' units
export const LITRE = 'ltr';
export const KILOGRAM = 'kg'
export const PIECE='PC';
export const UNITS = [LITRE, KILOGRAM, PIECE];

//rental-items types
export const COURSE = 'course';
export const ARTICLE = 'article';
export const RECOREDED_WORKSHOP = 'recorded workshop';
export const MEMBERSHIP = 'membership';
export const SME_EVENT = 'event';
export const RENTAL_ITEMS_TYPES = [COURSE, MEMBERSHIP, ARTICLE, RECOREDED_WORKSHOP, SME_EVENT];

//membership types
export const SILVER = 'silver';
export const GOLD = 'gold';
export const PLATINUM = 'platinum';
export const DIAMOND = 'diamond';
export const MEMBERSHIP_TYPES = [SILVER, GOLD, PLATINUM, DIAMOND];

//stripe payment statuses
export const PAID = 'paid';
export const UNPAID = 'unpaid';

//special roles
export const FOUNDER = 'Founder of SME Scaleup';
export const MARKETING_COORDINATOR = 'Marketing Coordinator';
export const FINANCIAL_ANALYST = 'Financial Analyst';
export const PROGRAM_MANAGER = 'Program Manager';
export const CUSTOMER_SUPPORT_SPECIALIST = 'Customer Support Specialist';
export const SPECIAL_ROLES = [FOUNDER, MARKETING_COORDINATOR, FINANCIAL_ANALYST, PROGRAM_MANAGER, CUSTOMER_SUPPORT_SPECIALIST];

//sme-owners statuses
export const SME_OWNER_VERIFIED = 'verified';
export const SME_OWNER_UNVERIFIED = 'unverified';
export const SME_OWNER_STATUSES = [SME_OWNER_UNVERIFIED, SME_OWNER_VERIFIED];


export const USER_TARGET = 'user';
export const RENTAL_ITEM_TARGET = 'rental item';
export const RENTAL_ITEM_ATTACHMENT_TARGET = 'rental item attachment';
export const MESSAGE_TARGETS = [USER_TARGET, RENTAL_ITEM_TARGET, RENTAL_ITEM_ATTACHMENT_TARGET];

export const VERIFIED = 'verified';
export const UNVERIFIED ='unverified';