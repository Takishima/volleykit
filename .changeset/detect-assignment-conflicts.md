---
"volleykit-web": minor
---

Add assignment conflict detection to warn when games are scheduled too close together

- Detects assignments less than 1 hour apart using the calendar feed
- Shows warning indicator on AssignmentCard for conflicting assignments
- Displays conflict details in expanded view (association, time gap, hall)
- Works across all associations since calendar contains all assignments
- Demo mode shows example conflicts for testing
- Custom evaluator support for location-based or other conflict logic
