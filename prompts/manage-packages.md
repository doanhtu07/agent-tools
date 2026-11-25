# Manage Package Dependencies

Given my set of projects that use `expo-template`

## Check versions

For Expo repos, use `pnpm epc` for Expo managed packages

## Check package age

For Expo managed packages, I allow bypassing `minimumReleaseAgeExclude`

But for other packages, ONLY update to the latest version THAT is not violating the minimum release age

Please check all packages carefully (either in NPM, POM, or something else)

## Old versions

Be careful! Some projects are explicitly using old Expo versions for a reason
