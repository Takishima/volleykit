import type { TranslationKeys } from './types';

export const en: TranslationKeys = {
  nav: {
    home: 'Home',
    gettingStarted: 'Getting Started',
    assignments: 'Assignments',
    exchanges: 'Exchanges',
    compensations: 'Compensations',
    calendarMode: 'Calendar Mode',
    travelTime: 'Travel Time',
    offlinePwa: 'Offline & PWA',
    settings: 'Settings',
  },

  common: {
    openApp: 'Open App',
    learnMore: 'Learn more',
    readMore: 'Read more',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    menu: 'Menu',
    search: 'Search',
    viewOnGithub: 'View on GitHub',
  },

  home: {
    title: 'VolleyKit Help',
    subtitle: 'Your guide to the VolleyKit app',
    description:
      'Learn how to use VolleyKit to manage your volleyball referee assignments, exchanges, and compensations.',
    ctaOpenApp: 'Open App',
    ctaGetStarted: 'Get Started',
    featuresTitle: 'Explore the Documentation',
    readyToStart: 'Ready to get started?',
    features: {
      gettingStarted: {
        title: 'Getting Started',
        description:
          'Quick start guide to set up and use VolleyKit for the first time.',
      },
      assignments: {
        title: 'Assignments',
        description:
          'View and manage your upcoming volleyball referee games.',
      },
      exchanges: {
        title: 'Exchanges',
        description:
          'Request game swaps and offer your assignments to other referees.',
      },
      compensations: {
        title: 'Compensations',
        description:
          'Track your referee earnings and compensation history.',
      },
      calendarMode: {
        title: 'Calendar Mode',
        description:
          'Read-only access to view assignments without logging in.',
      },
      travelTime: {
        title: 'Travel Time',
        description:
          'Calculate travel times using Swiss public transport integration.',
      },
      offlinePwa: {
        title: 'Offline & PWA',
        description:
          'Install the app and use it offline on your device.',
      },
      settings: {
        title: 'Settings',
        description:
          'Customize your language, theme, and notification preferences.',
      },
    },
  },

  pages: {
    gettingStarted: {
      title: 'Getting Started',
      description:
        'Learn how to set up and start using VolleyKit for your referee assignments.',
    },
    assignments: {
      title: 'Assignments',
      description:
        'Learn how to view and manage your volleyball referee assignments in VolleyKit.',
    },
    exchanges: {
      title: 'Exchanges',
      description:
        'Learn how to request and manage assignment exchanges with other referees.',
    },
    compensations: {
      title: 'Compensations',
      description:
        'Learn how to track and understand your referee compensation payments.',
    },
    calendarMode: {
      title: 'Calendar Mode',
      description:
        'Learn about calendar mode for read-only access to referee assignments.',
    },
    travelTime: {
      title: 'Travel Time',
      description:
        'Learn how VolleyKit calculates travel times to game venues using Swiss public transport.',
    },
    offlinePwa: {
      title: 'Offline & PWA',
      description:
        'Learn how to use VolleyKit offline and install it as a progressive web app.',
    },
    settings: {
      title: 'Settings',
      description:
        'Learn how to customize VolleyKit settings and preferences.',
    },
  },

  search: {
    placeholder: 'Search documentation...',
    placeholderShort: 'Search...',
    noResults: 'No results found',
    tryDifferent: 'Try different keywords',
    initialHint: 'Type to start searching',
    initialSubhint: 'Search across all documentation pages',
    searching: 'Searching...',
    unavailable: 'Search not available',
    unavailableHint: 'Run a production build to enable search',
    resultsCount: '{count} results',
    navigateHint: 'to navigate',
    selectHint: 'to select',
    poweredBy: 'Powered by Pagefind',
    shortcut: '⌘K',
  },

  footer: {
    builtWith: 'Built with Astro',
    forReferees: 'For Swiss volleyball referees',
    copyright: '© {year} VolleyKit',
    mainApp: 'Main App',
    documentation: 'Documentation',
    github: 'GitHub',
  },

  a11y: {
    openMenu: 'Open navigation menu',
    closeMenu: 'Close menu',
    openSearch: 'Search documentation',
    closeSearch: 'Close search',
    skipToContent: 'Skip to content',
    breadcrumb: 'Breadcrumb',
    mainNavigation: 'Main navigation',
    mobileNavigation: 'Mobile navigation',
    externalLink: 'Opens in new tab',
  },

  screenshot: {
    placeholder: 'Screenshot placeholder',
    captureInstructions: 'Capture instructions',
  },

  infoBox: {
    info: 'Info',
    tip: 'Tip',
    warning: 'Warning',
  },

  gettingStarted: {
    heading: 'Getting Started with VolleyKit',
    lead: 'VolleyKit is a progressive web application that provides an improved interface for managing your volleyball referee assignments through the Swiss Volleyball Federation\'s volleymanager system.',
    whatIs: {
      title: 'What is VolleyKit?',
      description: 'VolleyKit connects to the official volleymanager.volleyball.ch platform and provides a modern, mobile-friendly interface for referees to:',
      features: {
        viewAssignments: 'View upcoming game assignments',
        manageExchanges: 'Request and manage game exchanges with other referees',
        trackCompensations: 'Track compensation payments',
        offlineAccess: 'Access assignments offline',
        travelTime: 'Calculate travel times using Swiss public transport',
      },
      infoBox: 'VolleyKit is an unofficial app created to improve the referee experience. All data comes from the official volleymanager system.',
    },
    howToLogin: {
      title: 'How to Login',
      description: 'VolleyKit offers two ways to access your assignments:',
      calendarMode: {
        title: 'Option 1: Calendar Mode (Recommended)',
        description: 'For quick access to view your schedule without entering your password, you can use Calendar Mode with your unique calendar URL or code from volleymanager.',
        steps: {
          findUrl: {
            title: 'Find your calendar URL',
            description: 'In volleymanager, go to "My Assignments" and copy your calendar subscription URL.',
          },
          selectMode: {
            title: 'Select Calendar Mode',
            description: 'On the VolleyKit login page, tap the "Calendar Mode" tab.',
          },
          pasteUrl: {
            title: 'Paste your URL or code',
            description: 'Enter your calendar URL or just the code portion to access your schedule.',
          },
        },
        infoBox: 'Calendar Mode provides read-only access – you can view assignments but cannot confirm games, request exchanges, or access compensations. See the Calendar Mode guide for more details.',
      },
      fullLogin: {
        title: 'Option 2: Full Login',
        description: 'Use your volleymanager.volleyball.ch credentials for full access to all features.',
        steps: {
          openApp: {
            title: 'Open VolleyKit',
            description: 'Navigate to the VolleyKit app in your browser or open the installed app.',
          },
          enterCredentials: {
            title: 'Enter your credentials',
            description: 'Use your volleymanager username and password to log in.',
          },
          stayLoggedIn: {
            title: 'Stay logged in',
            description: 'Enable "Remember me" to stay logged in between sessions.',
          },
        },
        screenshotAlt: 'VolleyKit login page showing username and password fields',
        screenshotCaption: 'The VolleyKit login page',
        tipTitle: 'Can\'t remember your password?',
        tipContent: 'VolleyKit uses the same credentials as volleymanager.volleyball.ch. Use the password reset function on the official site if you\'ve forgotten your password.',
      },
    },
    quickTour: {
      title: 'Quick Tour',
      description: 'After logging in, you\'ll see the main dashboard with your upcoming assignments. Here\'s a quick overview of the main sections:',
      assignments: {
        title: 'Assignments',
        description: 'View all your upcoming referee games. Each assignment shows the date, time, teams, venue, and your role (1st referee, 2nd referee, or line judge).',
      },
      exchanges: {
        title: 'Exchanges',
        description: 'Browse available game exchanges from other referees or request an exchange for one of your own assignments.',
      },
      compensations: {
        title: 'Compensations',
        description: 'Track your referee payments and compensation history. Filter by date range and export your data.',
      },
      settings: {
        title: 'Settings',
        description: 'Customize your experience including language, home location for travel calculations, and notification preferences.',
      },
    },
    nextSteps: {
      title: 'Next Steps',
      description: 'Now that you\'re familiar with the basics, explore the detailed guides for each feature:',
      links: {
        assignments: 'Managing your assignments',
        exchanges: 'Requesting and accepting exchanges',
        compensations: 'Tracking your compensations',
      },
    },
  },

  assignments: {
    heading: 'Managing Your Assignments',
    lead: 'The Assignments section is your central hub for viewing all your upcoming volleyball referee games and managing your schedule.',
    whatAre: {
      title: 'What Are Assignments?',
      description: 'Assignments are the games you\'ve been scheduled to referee. Each assignment includes:',
      details: {
        dateTime: 'Date and time – When the game takes place',
        teams: 'Teams – Home and away team names',
        venue: 'Venue – Location of the game with address',
        role: 'Your role – 1st referee, 2nd referee, or line judge',
        league: 'League – The competition level (e.g., NLA, NLB, 1. Liga)',
      },
    },
    viewing: {
      title: 'Viewing Your Assignments',
      description: 'The assignment list shows all your upcoming games in chronological order. Games are grouped by date, making it easy to see what\'s coming up.',
      screenshotAlt: 'Assignment list showing multiple upcoming games grouped by date',
      screenshotCaption: 'The assignment list view with upcoming games',
    },
    details: {
      title: 'Assignment Details',
      description: 'Tap on any assignment to see the full details. The detail view includes:',
      items: {
        gameInfo: 'Complete game information',
        venueAddress: 'Venue address with map link',
        travelTime: 'Travel time from your home location',
        otherReferees: 'Other referees assigned to the same game',
        swipeActions: 'Available actions via swipe gestures',
      },
      screenshotAlt: 'Assignment detail view showing all game information',
      screenshotCaption: 'Detailed view of a single assignment',
    },
    actions: {
      title: 'Taking Actions',
      description: 'VolleyKit uses swipe gestures to quickly access actions on your assignment cards. Depending on the game status, you may have different actions available.',
      swipeRight: {
        title: 'Swipe Right – Add to Exchange',
        description: 'Swipe an assignment card to the right to reveal the exchange action. If you can\'t attend a game, you can add it to the exchange board for other referees to pick up.',
        screenshotAlt: 'Assignment card swiped right showing exchange action',
        screenshotCaption: 'Swipe right to add an assignment to the exchange board',
        warning: 'Make sure to request an exchange well in advance. Last-minute requests may not find a replacement in time.',
      },
      swipeLeft: {
        title: 'Swipe Left – Validate & Edit',
        description: 'Swipe an assignment card to the left to reveal additional actions:',
        validate: 'Validate – Submit game results and validate the match (available for first referees after the game)',
        edit: 'Edit – Edit your compensation details for this assignment',
        screenshotAlt: 'Assignment card swiped left showing validate and edit actions',
        screenshotCaption: 'Swipe left to reveal validate and edit actions',
        tip: 'You can also perform a full swipe to immediately trigger the primary action without tapping the button.',
      },
      directions: {
        title: 'Get Directions',
        description: 'Tap on an assignment card to expand it, then use the directions button to open your preferred maps application with directions to the venue.',
      },
    },
    upcomingPast: {
      title: 'Upcoming and Past Games',
      description: 'Use the tabs at the top to switch between:',
      upcoming: 'Upcoming – Games that haven\'t happened yet',
      validationClosed: 'Validation Closed – Past games where validation is complete',
      tip: 'Set your home location in Settings to see travel time estimates on each assignment card.',
    },
  },

  exchanges: {
    heading: 'Game Exchanges',
    lead: 'The exchange system allows referees to swap games when they can\'t attend their scheduled assignments. You can request exchanges for your games or pick up games from other referees.',
    whatAre: {
      title: 'What Are Exchanges?',
      description: 'An exchange is a request from a referee who can\'t attend their scheduled game and is looking for a replacement. The volleymanager system maintains an exchange board where referees can:',
      features: {
        postGames: 'Post their games for exchange',
        browseGames: 'Browse available games from other referees',
        acceptGames: 'Accept games that fit their schedule',
      },
      infoBox: 'Exchanges are managed through the official volleymanager system. VolleyKit provides a more user-friendly interface to the same exchange board.',
    },
    requesting: {
      title: 'Requesting an Exchange',
      description: 'When you can\'t attend one of your scheduled games, you can request an exchange to find a replacement referee.',
      steps: {
        findAssignment: {
          title: 'Find the assignment',
          description: 'Go to your Assignments tab and locate the game you want to exchange.',
        },
        swipeRight: {
          title: 'Swipe right on the card',
          description: 'Swipe the assignment card to the right to reveal the exchange action, then tap it. The game will be posted to the exchange board.',
        },
      },
      screenshotAlt: 'Assignment card with exchange swipe action revealed',
      screenshotCaption: 'Requesting an exchange for a game',
      warningTitle: 'Request early',
      warningContent: 'The earlier you request an exchange, the more likely you\'ll find a replacement. Last-minute requests often go unfilled.',
    },
    viewing: {
      title: 'Viewing Available Exchanges',
      description: 'The Exchanges tab shows all games currently available for exchange. These are games that other referees have posted and are looking for replacements.',
      screenshotAlt: 'List of available exchange games from other referees',
      screenshotCaption: 'Available games on the exchange board',
      filtering: {
        title: 'Filtering Exchanges',
        description: 'Filter the exchange list to find games that work for you. Filters become available after you configure the required settings:',
        distance: 'Distance – Filter by maximum distance from your home location. Requires setting your home location in Settings.',
        travelTime: 'Travel time – Filter by maximum travel time using public transport. Requires both a home location and enabling the public transport API in Settings.',
        usage: 'Once filters are available, they appear as toggle chips next to the settings gear icon. Tap the gear to configure the maximum values for each filter.',
        tip: 'Set your home location in Settings to unlock distance filtering. Enable the public transport API to also filter by travel time.',
      },
    },
    accepting: {
      title: 'Accepting an Exchange',
      description: 'When you find a game you\'d like to take over, you can accept the exchange:',
      steps: {
        review: {
          title: 'Review the game details',
          description: 'Check the date, time, venue, and travel requirements.',
        },
        swipeLeft: {
          title: 'Swipe left on the card',
          description: 'Swipe the exchange card to the left to reveal the take over action, then tap it.',
        },
        confirm: {
          title: 'Confirm your acceptance',
          description: 'Review the details and confirm your acceptance.',
        },
        gameAdded: {
          title: 'Game added to your schedule',
          description: 'The game now appears in your assignments.',
        },
      },
      tip: 'Make sure you can actually attend the game before accepting. Once accepted, the original referee is released from the assignment.',
    },
    managing: {
      title: 'Managing Your Exchange Requests',
      description: 'You can view and manage your active exchange requests from the Exchanges tab. If you no longer need an exchange (e.g., your schedule changed), you can cancel the request before someone accepts it.',
      canceling: {
        title: 'Canceling a Request',
        description: 'To cancel an exchange request you\'ve made:',
        steps: {
          goToExchanges: 'Go to the Exchanges tab',
          selectAddedByMe: 'Select the "Added by Me" tab to see your pending requests',
          swipeRight: 'Swipe right on the request card to reveal the remove action, then tap it',
          confirmCancellation: 'Confirm the cancellation',
        },
        infoBox: 'You can only cancel an exchange request if no one has accepted it yet. Once accepted, the exchange is final.',
      },
    },
  },

  compensations: {
    heading: 'Tracking Your Compensations',
    lead: 'The Compensations section helps you track your referee earnings and payment history. View past payments, filter by date range, and export your data for record-keeping.',
    whatAre: {
      title: 'What Are Compensations?',
      description: 'Compensations are the payments you receive for officiating volleyball games. Each compensation entry typically includes:',
      details: {
        gameDetails: 'Game details – The match you officiated',
        date: 'Date – When the game took place',
        amount: 'Amount – The compensation amount in CHF',
        paymentStatus: 'Payment status – Pending, paid, or processed',
        role: 'Role – Your function in the game',
      },
      infoBox: 'Compensation amounts are set by Swiss Volley and vary based on the league level and your role in the game.',
    },
    viewing: {
      title: 'Viewing Your Compensations',
      description: 'The compensation list shows all your recorded payments in chronological order. Each entry displays the key information at a glance.',
      screenshotAlt: 'Compensation list showing payment history with amounts and dates',
      screenshotCaption: 'Your compensation history',
      paymentStatus: {
        title: 'Understanding Payment Status',
        pending: 'Pending – Game completed, payment not yet processed',
        processing: 'Processing – Payment is being processed',
        paid: 'Paid – Payment has been made to your account',
      },
    },
    filtering: {
      title: 'Filtering by Status',
      description: 'Use the tabs at the top to filter compensations by their status:',
      tabs: {
        pendingPast: 'Pending (Past) – Past games awaiting payment',
        pendingFuture: 'Pending (Future) – Upcoming games not yet played',
        closed: 'Closed – Completed and paid compensations',
      },
      screenshotAlt: 'Compensation tabs showing pending and closed options',
      screenshotCaption: 'Filtering compensations by status',
      tip: 'Compensations are automatically filtered to the current season (September to May) so you can focus on recent games.',
    },
    exportPdf: {
      title: 'Export to PDF',
      description: 'You can export individual compensation records as PDF documents. Swipe left on any compensation card to reveal the PDF export action.',
      usage: 'The exported PDF includes the game details and compensation information in a formatted document. This is useful for providing to teams that need to pay the referee directly.',
      infoBox: 'The PDF export creates an official-looking document with all the game and compensation details that teams may require for their records.',
    },
    paymentSchedule: {
      title: 'Payment Schedule',
      description: 'Compensation payments are typically processed monthly by Swiss Volley. The exact payment schedule may vary, but generally:',
      details: {
        processing: 'Games from the previous month are processed at the start of each month',
        bankTransfer: 'Payments are made via bank transfer to your registered account',
        timing: 'Processing may take 2-4 weeks after the month ends',
      },
      warning: 'Make sure your bank details are up to date in the volleymanager system to avoid payment delays.',
    },
  },

  calendarMode: {
    heading: 'Calendar Mode',
    lead: 'Calendar mode provides read-only access to view referee assignments without requiring a full login. It\'s perfect for quickly checking your schedule or sharing with family members.',
    whatIs: {
      title: 'What Is Calendar Mode?',
      description: 'Calendar mode is a lightweight view-only access method that lets you see your upcoming assignments without entering your password. It uses a unique calendar code that\'s linked to your referee account.',
      features: {
        viewAssignments: 'View your upcoming game assignments',
        seeDetails: 'See game details including date, time, teams, and venue',
        noPassword: 'No password required – just your calendar code',
        safeToShare: 'Safe to share with family or add to shared calendars',
      },
    },
    whoIsFor: {
      title: 'Who Is Calendar Mode For?',
      description: 'Calendar mode is ideal for:',
      useCases: {
        quickChecks: 'Quick schedule checks – View your games without logging in',
        familyMembers: 'Family members – Share your schedule with partners or family',
        calendarIntegration: 'Calendar integration – Add games to external calendar apps',
        publicDevices: 'Public devices – Check your schedule on shared computers',
      },
      tip: 'Calendar mode is perfect for letting your family know when you have games without giving them access to your full account.',
    },
    howToAccess: {
      title: 'How to Access Calendar Mode',
      description: 'To use calendar mode, you need your unique calendar code from the volleymanager system.',
      steps: {
        findCode: {
          title: 'Find your calendar code',
          description: 'Log in to volleymanager.volleyball.ch and find your calendar code in your profile settings.',
        },
        openApp: {
          title: 'Open VolleyKit',
          description: 'Navigate to the VolleyKit app.',
        },
        selectMode: {
          title: 'Select "Calendar Mode"',
          description: 'On the login page, tap the "Calendar Mode" option.',
        },
        enterCode: {
          title: 'Enter your code',
          description: 'Input your calendar code to access your read-only schedule.',
        },
      },
      screenshotAlt: 'Calendar mode entry screen with code input field',
      screenshotCaption: 'Entering calendar mode with your code',
    },
    viewingSchedule: {
      title: 'Viewing Your Schedule',
      description: 'Once in calendar mode, you\'ll see your upcoming assignments in a simplified view. The interface shows the essential information for each game.',
      screenshotAlt: 'Calendar mode showing upcoming assignments in read-only view',
      screenshotCaption: 'Calendar mode assignment view',
    },
    limitations: {
      title: 'Limitations vs Full Login',
      description: 'Calendar mode is read-only, which means some features are not available:',
      table: {
        feature: 'Feature',
        fullLogin: 'Full Login',
        calendarMode: 'Calendar Mode',
        viewAssignments: 'View assignments',
        viewDetails: 'View game details',
        travelTime: 'Travel time info',
        confirmAssignments: 'Confirm assignments',
        requestExchanges: 'Request exchanges',
        viewCompensations: 'View compensations',
        acceptExchanges: 'Accept exchanges',
      },
      infoBox: 'For any actions like confirming assignments or requesting exchanges, you\'ll need to log in with your full credentials.',
    },
    security: {
      title: 'Keeping Your Code Secure',
      description: 'While calendar mode is read-only, your calendar code should still be treated with care:',
      tips: {
        shareWithTrust: 'Only share with people you trust',
        dontPostPublicly: 'Don\'t post your code publicly online',
        ifCompromised: 'If you suspect your code has been compromised, contact Swiss Volley',
      },
      warning: 'Your calendar code reveals your full game schedule. Only share it with people you\'re comfortable knowing your whereabouts.',
    },
  },

  travelTime: {
    heading: 'Travel Time Feature',
    lead: 'VolleyKit integrates with Swiss public transport data to show you how long it takes to reach each game venue. Plan your trips better and never be late to a game.',
    howItWorks: {
      title: 'How It Works',
      description: 'The travel time feature uses the Swiss public transport API (SBB/öV) to calculate journey times from your home location to each game venue. It considers:',
      considerations: {
        schedules: 'Real-time train, bus, and tram schedules',
        walkingTime: 'Walking time to/from stations',
        transferTimes: 'Transfer times between connections',
        gameStartTime: 'The actual game start time',
      },
      infoBox: 'Travel times are calculated using public transport. If you typically drive, use the times as a rough estimate or for planning alternative transport options.',
    },
    settingHome: {
      title: 'Setting Your Home Location',
      description: 'To get accurate travel times, you need to set your home location in the app settings.',
      steps: {
        openSettings: {
          title: 'Open Settings',
          description: 'Navigate to the Settings page in VolleyKit.',
        },
        findHomeLocation: {
          title: 'Find "Home Location"',
          description: 'Scroll to the travel settings section.',
        },
        enterAddress: {
          title: 'Enter your address',
          description: 'Type your home address or the station you typically travel from.',
        },
        saveSettings: {
          title: 'Save your settings',
          description: 'Confirm your location to start seeing travel times.',
        },
      },
      screenshotAlt: 'Settings page showing home location input field',
      screenshotCaption: 'Setting your home location',
      tip: 'Use your nearest train station as your home location if you typically walk or cycle to the station – this gives more accurate public transport times.',
    },
    viewingTimes: {
      title: 'Viewing Travel Times',
      description: 'Once your home location is set, travel times appear on your assignment cards and in the assignment detail view.',
      screenshotAlt: 'Assignment card showing travel time information',
      screenshotCaption: 'Travel time displayed on an assignment',
      whatsShown: {
        title: 'What\'s Shown',
        duration: 'Duration – Total travel time from home to venue',
        departureTime: 'Departure time – When you should leave to arrive on time',
        transportType: 'Transport type – Train, bus, or mixed transport icon',
      },
    },
    journeyDetails: {
      title: 'Journey Details',
      description: 'Tap on the travel time to see full journey details:',
      features: {
        stepByStep: 'Step-by-step directions',
        connectionDetails: 'Connection details (train numbers, platforms)',
        walkingSegments: 'Walking segments',
        transferTimes: 'Transfer times',
      },
      sbbLink: 'You can also open the journey directly in the SBB app or website for real-time updates and ticket purchase.',
      screenshotAlt: 'Detailed journey information with connections and times',
      screenshotCaption: 'Full journey details for travel planning',
    },
    arrivalBuffer: {
      title: 'Arrival Buffer',
      description: 'The suggested departure time includes a buffer to ensure you arrive before the game starts:',
      details: {
        standardBuffer: 'Standard buffer: 15-30 minutes before game time',
        timeFor: 'Time for finding the venue, changing, and warmup',
        accountForDelays: 'Account for potential minor delays',
      },
      warning: 'Always allow extra time for important games or unfamiliar venues. Public transport can experience unexpected delays.',
    },
    offlineAvailability: {
      title: 'Offline Availability',
      description: 'Travel times are cached when you view them online. If you\'re offline:',
      details: {
        cachedAvailable: 'Previously viewed travel times remain available',
        requiresConnection: 'New calculations require an internet connection',
        outdatedIndicator: 'The app indicates when data might be outdated',
      },
      tip: 'Check your travel times while online before heading to an area with poor connectivity. The cached data will be available offline.',
    },
  },

  offlinePwa: {
    heading: 'Offline & PWA Features',
    lead: 'VolleyKit is a Progressive Web App (PWA) that you can install on your device and use offline. Access your assignments even without an internet connection.',
    whatIsPwa: {
      title: 'What Is a PWA?',
      description: 'A Progressive Web App is a website that works like a native app. When you install VolleyKit:',
      benefits: {
        homeScreen: 'It appears on your home screen like a regular app',
        ownWindow: 'Opens in its own window without browser UI',
        worksOffline: 'Works offline for previously viewed content',
        autoUpdates: 'Receives updates automatically',
        minimalStorage: 'Uses minimal storage compared to native apps',
      },
      tip: 'PWAs combine the best of web and native apps – easy installation, automatic updates, and offline capability without app store downloads.',
    },
    installing: {
      title: 'Installing the App',
      description: 'You can install VolleyKit on any modern device – phones, tablets, or computers.',
      ios: {
        title: 'On iOS (iPhone/iPad)',
        steps: {
          openSafari: {
            title: 'Open VolleyKit in Safari',
            description: 'The install feature only works in Safari on iOS.',
          },
          tapShare: {
            title: 'Tap the Share button',
            description: 'Find the share icon at the bottom of the screen.',
          },
          selectAddHome: {
            title: 'Select "Add to Home Screen"',
            description: 'Scroll down in the share menu to find this option.',
          },
          confirmInstall: {
            title: 'Confirm the installation',
            description: 'Tap "Add" to install VolleyKit on your home screen.',
          },
        },
      },
      android: {
        title: 'On Android',
        steps: {
          openChrome: {
            title: 'Open VolleyKit in Chrome',
            description: 'Other browsers like Firefox also support PWA installation.',
          },
          lookForPrompt: {
            title: 'Look for the install prompt',
            description: 'A banner or prompt should appear asking to install the app.',
          },
          tapInstall: {
            title: 'Tap "Install" or "Add to Home Screen"',
            description: 'Confirm to add the app to your device.',
          },
        },
      },
      screenshotAlt: 'PWA install prompt showing Add to Home Screen option',
      screenshotCaption: 'Installing VolleyKit on your device',
      desktop: {
        title: 'On Desktop (Chrome/Edge)',
        description: 'Look for the install icon in the address bar (usually a + or computer icon), or use the browser menu to find "Install VolleyKit".',
      },
    },
    whatWorksOffline: {
      title: 'What Works Offline',
      description: 'When you\'re offline, you can still access content you\'ve previously viewed:',
      table: {
        feature: 'Feature',
        offline: 'Offline',
        notes: 'Notes',
        viewAssignments: 'View assignments',
        viewAssignmentsNote: 'Previously loaded assignments',
        viewDetails: 'View game details',
        viewDetailsNote: 'If previously viewed',
        travelTimes: 'Travel times',
        travelTimesNote: 'Cached journey data',
        confirmAssignments: 'Confirm assignments',
        confirmAssignmentsNote: 'Requires connection',
        requestExchanges: 'Request exchanges',
        requestExchangesNote: 'Requires connection',
        viewCompensations: 'View compensations',
        viewCompensationsNote: 'If previously loaded',
      },
      infoBox: 'The app automatically syncs when you\'re back online. Any data changes will be fetched and displayed.',
    },
    offlineIndicator: {
      title: 'Offline Indicator',
      description: 'When you\'re offline, VolleyKit shows a visual indicator so you know you\'re viewing cached data. Look for the offline badge in the header or a banner at the top of the screen.',
      screenshotAlt: 'Offline indicator showing the app is running without internet',
      screenshotCaption: 'Offline mode indicator',
    },
    updating: {
      title: 'Updating the App',
      description: 'VolleyKit updates automatically in the background. When a new version is available:',
      steps: {
        backgroundDownload: 'The app downloads the update in the background',
        notificationAppears: 'A notification appears when the update is ready',
        tapReload: 'Tap "Reload" to activate the new version',
      },
      screenshotAlt: 'App update notification prompting to reload',
      screenshotCaption: 'Update available notification',
      tip: 'If you dismiss the update notification, the new version will activate the next time you close and reopen the app.',
    },
    storage: {
      title: 'Storage Usage',
      description: 'VolleyKit uses minimal storage on your device – typically less than 5MB for the app itself plus cached data. You can clear the cache from your browser settings if needed.',
      warning: 'Clearing browser data or "Clear Cache" will remove your offline data. You may need to reload assignments the next time you open the app.',
    },
  },

  settings: {
    heading: 'App Settings',
    lead: 'Customize VolleyKit to match your preferences. Configure language, home location, and privacy options.',
    accessing: {
      title: 'Accessing Settings',
      description: 'Open settings by tapping the gear icon in the navigation bar, or by selecting "Settings" from the main menu.',
      screenshotAlt: 'Settings page showing all available options',
      screenshotCaption: 'VolleyKit settings page',
    },
    profile: {
      title: 'Profile Section',
      description: 'The profile section shows your account information:',
      fields: {
        name: 'Name – Your registered referee name',
        licenseNumber: 'License number – Your Swiss Volley referee license',
        email: 'Email – Your registered email address',
        sessionStatus: 'Session status – Your current login status',
      },
      infoBox: 'Profile information comes from volleymanager and can only be changed on the official website, not in VolleyKit.',
      loggingOut: {
        title: 'Logging Out',
        description: 'Tap "Log Out" to sign out of your account. This clears your session and any locally stored data.',
      },
    },
    language: {
      title: 'Language Settings',
      description: 'VolleyKit supports multiple languages to match your preference:',
      options: {
        deutsch: 'Deutsch – German',
        english: 'English – English',
        francais: 'Français – French',
        italiano: 'Italiano – Italian',
      },
      autoDetect: 'The app will automatically use your browser\'s language if it\'s supported, but you can override this in settings.',
      screenshotAlt: 'Language selection showing available options',
      screenshotCaption: 'Changing the app language',
    },
    homeLocation: {
      title: 'Home Location',
      description: 'Set your home location to enable travel time calculations. This is used to show how long it takes to reach each game venue.',
      instructions: {
        enterAddress: 'Enter your address or nearest train station',
        useAutocomplete: 'Use the autocomplete suggestions for accuracy',
        travelTimesAppear: 'Travel times will appear on your assignment cards',
      },
      screenshotAlt: 'Home location input with address search',
      screenshotCaption: 'Setting your home location',
      tip: 'If you typically take public transport, use your nearest station as your home location for more accurate journey times.',
      seeGuide: 'See the Travel Time guide for more details on this feature.',
    },
    dataPrivacy: {
      title: 'Data & Privacy',
      description: 'Control how your data is handled:',
      localStorage: {
        title: 'Local Storage',
        description: 'VolleyKit stores data locally to enable offline access and improve performance:',
        items: {
          assignmentCache: 'Assignment cache – Your recent assignments',
          preferences: 'Preferences – Your settings and preferences',
          travelData: 'Travel data – Cached journey information',
        },
      },
      clearData: {
        title: 'Clear Local Data',
        description: 'You can clear all locally stored data from the settings page. This will:',
        effects: {
          removeCached: 'Remove cached assignments and travel data',
          resetPreferences: 'Reset all preferences to defaults',
          requireLogin: 'Require you to log in again',
        },
        warning: 'Clearing local data cannot be undone. You\'ll need to reload your assignments the next time you open the app.',
      },
      screenshotAlt: 'Data and privacy settings section with clear data button',
      screenshotCaption: 'Data and privacy options',
    },
    about: {
      title: 'About VolleyKit',
      description: 'The About section shows:',
      items: {
        versionNumber: 'Version number – Current app version',
        lastUpdated: 'Last updated – When the app was last updated',
        links: 'Links – GitHub repository, issue tracker, help site',
      },
      infoBox: 'Check the version number when reporting issues – it helps us identify and fix problems faster.',
    },
  },
};
