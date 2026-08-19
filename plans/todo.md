## Remaining TODOs before submitting

- [x] Add reports page + comments mutation
- [ ] TLE propagation + contact-planning map (`/map`) — plan in `contact-planning-map.md`
  - L1 (live positions) and L2 (footprints/links) done; L3 contact windows remain
  - server never signals TLE failure (logs it, freezes last coords — or seed `[0,0]`); client must detect bad TLEs itself
- [ ] mission planning 
- [x] Tests on business logic
- [x] CI pipeline (unit tests, lint, stylelint, format, build)
- [x] Add Prettier and Stylelint
- [ ] Error/loading states, polish



## CLEANUP ITEMS
- [ ] Write the AI usage section in your own words
- [ ] Fill in the state management and design rationale sections
- [ ] `make clean` before packaging, to strip `node_modules` and build output
