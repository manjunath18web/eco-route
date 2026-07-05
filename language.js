const translations = {
    'en': {
        // Shared Navigation
        'nav_home': 'Home',
        'nav_history': 'History',
        'nav_logout': 'Logout',
        'project_name': 'EcoRoute Explorer',

        // Login & Landing Page (from Screenshot 278)
        'sub_heading': 'Our planet is struggling. Choose your role to find a cleaner path.',
        'user_login': 'User Login',
        'admin_access': 'Admin Access',

        // Registration Page
        'reg_title': 'Create Account',
        'username': 'Username',
        'email': 'Email',
        'password': 'Password',
        'confirm_pass': 'Confirm Password',
        'register_btn': 'Register',
        'already_account': 'Already have an account? Login',

        // Index/Search Page
        'find_optimal': 'Optimal Route Finder',
        'start_loc': 'Starting Point',
        'dest_city': 'Destination City',
        'veh_type': 'Vehicle Type',
        'car': 'Car',
        'bike': 'Bike',
        'bus': 'Bus',
        'find_btn': 'Find Route',

        // Route Calculation Page
        'trip_summary': 'Trip Summary',
        'from': 'From',
        'to': 'To',
        'vehicle': 'Vehicle',
        'green_route': 'Green Route',
        'red_route': 'Red Route',
        'select_green': 'Select Green Route',
        'select_red': 'Select Red Route',
        'new_search': 'New Search',
        'co2_emissions': 'CO2 Emissions',
        'distance': 'Distance',
        'duration': 'Duration',
        'grams': 'Grams',

        // Navigation Modal & Dashboard
        'route_selected': 'Route Selected',
        'start_nav': 'Start Navigation',
        'change_route': 'Change Route',
        'nav_active': 'Navigation Active',
        'stop_nav': 'Stop',
        'remaining': 'Remaining'
    },
    'hi': {
        // Shared Navigation
        'nav_home': 'मुख्य पृष्ठ',
        'nav_history': 'इतिहास',
        'nav_logout': 'लॉग आउट',
        'project_name': 'इको-रूट एक्सप्लोरर',

        // Login & Landing Page
        'sub_heading': 'हमारी पृथ्वी संघर्ष कर रही है। स्वच्छ रास्ता चुनने के लिए अपनी भूमिका चुनें।',
        'user_login': 'उपयोगकर्ता लॉगिन',
        'admin_access': 'एडमिन एक्सेस',

        // Registration Page
        'reg_title': 'खाता बनाएं',
        'username': 'उपयोगकर्ता का नाम',
        'email': 'ईमेल',
        'password': 'पासवर्ड',
        'confirm_pass': 'पासवर्ड की पुष्टि करें',
        'register_btn': 'रजिस्टर करें',
        'already_account': 'पहले से ही खाता है? लॉगिन करें',

        // Index/Search Page
        'find_optimal': 'इष्टतम रास्ता खोजक',
        'start_loc': 'प्रस्थान बिंदु',
        'dest_city': 'गंतव्य शहर',
        'veh_type': 'वाहन का प्रकार',
        'car': 'कार',
        'bike': 'बाइक',
        'bus': 'बस',
        'find_btn': 'रास्ता खोजें',

        // Route Calculation Page
        'trip_summary': 'यात्रा सारांश',
        'from': 'से',
        'to': 'तक',
        'vehicle': 'वाहन',
        'green_route': 'हरा रास्ता',
        'red_route': 'लाल रास्ता',
        'select_green': 'हरा रास्ता चुनें',
        'select_red': 'लाल रास्ता चुनें',
        'new_search': 'नई खोज',
        'co2_emissions': 'CO2 उत्सर्जन',
        'distance': 'दूरी',
        'duration': 'समय',
        'grams': 'ग्राम',

        // Navigation Modal & Dashboard
        'route_selected': 'रास्ता चुना गया',
        'start_nav': 'नेविगेशन शुरू करें',
        'change_route': 'रास्ता बदलें',
        'nav_active': 'नेविगेशन सक्रिय है',
        'stop_nav': 'रोकें',
        'remaining': 'शेष समय'
    }
};

function setLanguage(lang) {
    localStorage.setItem('selectedLanguage', lang);
    applyTranslations();
}

function applyTranslations() {
    const lang = localStorage.getItem('selectedLanguage') || 'en';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            const icon = el.querySelector('i');
            if (icon) {
                // Keep icons for buttons while changing text
                el.innerHTML = '';
                el.appendChild(icon);
                el.appendChild(document.createTextNode(' ' + translations[lang][key]));
            } else if (el.tagName === 'INPUT' && el.placeholder) {
                // Update placeholders for input fields
                el.placeholder = translations[lang][key];
            } else {
                // Update standard text
                el.innerText = translations[lang][key];
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', applyTranslations);