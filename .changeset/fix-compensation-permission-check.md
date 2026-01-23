---
"volleykit-web": patch
---

Fix compensation editing to respect API permissions

The app now checks the `_permissions.properties.convocationCompensation.update` field from the API response before allowing compensation editing. This prevents users from seeing an edit option for compensations they cannot actually modify on volleymanager.
