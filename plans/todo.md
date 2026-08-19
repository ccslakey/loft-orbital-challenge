## Remaining TODOs before submitting

- [x] Add reports page + comments mutation
- [x] TLE propagation + contact-planning map (`/map`) — plan in `contact-planning-map.md`; all three phases landed
  - server never signals TLE failure (logs it, freezes last coords — or seed `[0,0]`); client detects bad TLEs itself
- [ ] mission planning 
- [x] Tests on business logic
- [x] CI pipeline (unit tests, lint, stylelint, format, build)
- [x] Add Prettier and Stylelint
- [ ] Error/loading states, polish



## CLEANUP ITEMS
- [ ] Write the AI usage section in your own words
- [ ] Fill in the state management and design rationale sections
- [ ] `make clean` before packaging, to strip `node_modules` and build output
