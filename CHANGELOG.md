# [1.10.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.9.0...v1.10.0) (2026-02-13)


### Features

* Login/logout page improvements ([08ae567](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/08ae567fef6f6269350de9e1926287740cf4e36a))
* Make user preferences persist for client-paginated grids ([2c58d3f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2c58d3f6031604050cc4d7c858a56472de6250db))
* New maintenance and error pages ([14b599a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/14b599a2294424a435ef222bf6a3351d8b2cd274))

# [1.9.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.8.1...v1.9.0) (2026-01-26)


### Bug Fixes

* If filters are present, advanced search should open by default ([39a1a08](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/39a1a0878a021caa886ff9715908fbb667f14eb0))
* Prevent future issues with isEnabledForPickupAnywhere [DCB-2116] ([01100dc](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/01100dcffd66f7a38ffb4098e8228b28ae84a615))
* Properly escape search queries [DCB-2118] ([aa0a836](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/aa0a8369c04e3776670538202ba13fa43f705274))


### Features

* Patron requesting history [DCB-2063] ([649fc40](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/649fc40f6a75b54b0ba06f36ade6f131c2954bd6))

## [1.8.1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.8.0...v1.8.1) (2026-01-09)


### Bug Fixes

* Improve cleanup behaviour [DCB-2063] ([6d5a9c9](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6d5a9c919688bebeea74c7d33c51d56e971c4098))

# [1.8.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.7.1...v1.8.0) (2026-01-08)


### Bug Fixes

* Fix for last 30 / 90 days filter [DCB-2110] ([5690292](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/569029266fed53d19092502546dee5fff6050073))
* Improvements to searching [DCB-2114] ([105d729](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/105d729f3a5bfcba0904ff097ebc35fd069157af))


### Features

* Add bib records section [DCB-2088] ([fa5de4c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/fa5de4c14459fd5a0912e2a795bdd38d4d8e5ef3))
* Implement date-time range filtering [DCB-2110] ([b4fffcf](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b4fffcf0d2fe29bbf9dc134478135173caa3a36f))

## [1.7.1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.7.0...v1.7.1) (2025-12-12)


### Bug Fixes

* Make item barcode show in the data grid ([33dc871](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/33dc871a4a12f10d8ec5fd6781f08bf09ea8c77b))

# [1.7.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.6.0...v1.7.0) (2025-12-12)


### Bug Fixes

* Don't show request link to read-only users ([a9ab407](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a9ab407e5b7f5898b063a7cb7b57bfd2205c16f1))
* Improve handling of live availability errors ([1420824](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/14208249118473ab4c701d4a8535a8ecf0c5f6ad))


### Features

* Add better error handling for filters and sorts [DCB-2100] ([4c9947c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4c9947cd14785dae9619d1b0f3dbdb43217a4e32))
* Improve the filtering experience [DCB-2064] ([ef43a64](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ef43a64a27f3755bc01fe64b5ea9908d0853dd47))

# [1.6.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.5.0...v1.6.0) (2025-11-20)


### Bug Fixes

* Don't allow editing of library info if DENY_MAPPING_EDIT is on ([68fc9fd](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/68fc9fd6770954f2cc95274c0dca1d3ffdf3e93c))
* Fix call number presentation [DCB-2087] ([bd7805b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/bd7805bf555cf9207453635e4bac611e343f73ce))
* Improve text on Items page ([a935483](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a935483dd04131f3449376a9897ed7de919764ad))
* Make service URLs non clickable ([a36f835](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a36f835aebebf228bd668da0d43bf1a6c6984987))


### Features

* Add basic stats to library page ([af1e713](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/af1e713575665a3913f3eee91d387ced336ce2eb))
* Add patron library filter [DCB-2064] ([fad189f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/fad189feadcc752fcb917237bbe2677c57ddc322))
* Add workflow options filter [DCB-2064] ([ce4fc55](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ce4fc55b698b75cc387eae0a1f62ef7ecff054d9))
* Improve item presentation [DCB-2087] ([cc0a91d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/cc0a91d0cf4c64be6dddb46497182f48b72b92d0))
* Provide a status drop-down filter ([c9686d6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c9686d69cb1ef38da4b8f9b7dc242593e4a70cb1))

# [1.5.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.4.1...v1.5.0) (2025-11-07)


### Bug Fixes

* Temporarily disable searching on the grids ([5a22561](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5a225616b59d672cc6d2275d8fad6aae29895e21))


### Features

* Provide a supplying library filter ([b829b0b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b829b0b1ab3f40c585c05989120d4653e5b62530))

## [1.4.1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.4.0...v1.4.1) (2025-10-30)


### Bug Fixes

* Fix location not displaying in non-PUA systems ([8dba411](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8dba41157cb4bb4976512b5adfb5411cd3696adf))

# [1.4.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.3.0...v1.4.0) (2025-10-24)


### Bug Fixes

* Data grid text fixes [DCB-1997] ([cdec7b6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/cdec7b69c61a5d75979239d3cf0c65eee3c430f8))
* Fix cluster record link and add title tooltip ([8ad19a6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8ad19a6558af3995752f6c654220ed9076456a76))
* Fix patron request pickup location link [DCB-1993] ([65a1d78](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/65a1d7869717d832cd4ba6d86121ffbe20bc2089))


### Features

* Introduce patron, supplier and pickup library names [DCB-2054] ([28c29d2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/28c29d247cf578a08bbe89dea511f9967fe55840))
* Read-only individual location page [DCB-1993] ([78bd94d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/78bd94d543bcc6d46a626d3e9f834e5a898fa383))

# [1.3.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.2.1...v1.3.0) (2025-10-07)


### Bug Fixes

* Fix broken pagination and cut-off-cards ([c470db0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c470db017feccbb3dd03c351fe5d6a9a7c98e08c))


### Features

* Initial requesting-only mode [DCB-2035] ([9fb5eba](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9fb5ebaa1ed1ba142710056fe6cf7bd9f76f3303))
* Introduce limited requesting-only mode [DCB-2035] ([b0ab0fb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b0ab0fb08cb646f9977053f4d9c58bd1a4a8d137))

## [1.2.1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.2.0...v1.2.1) (2025-09-05)


### Bug Fixes

* Temporarily disable locations click-through ([51091b5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/51091b5f8475d80d37ab544584aad690a345add6))

# [1.2.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.1.0...v1.2.0) (2025-09-05)


### Bug Fixes

* Fix bug where search did not show ([be6731f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/be6731fd3550b92f363f34547220ab86eae2fd2d))


### Features

* Add item availability indicators, improve layout [DCB-1999] ([a882e92](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a882e92b934cc4a3a8e6ad93a080fb30cfcb3ed9))
* Add locations page, standardise page sizes [DCB-1993] ([9a7a45a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9a7a45a8bd6a730e651ccb10b4aa1a953639c59c))
* Add new fields to cluster record page, split tabs [DCB-1999] ([49e029b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/49e029bfecb74f40c1295da668beb4d60b5e2154))
* Advanced search toggle [DCB-1999] ([2cb43dd](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2cb43dd5b91e67a409b08688d37b2e0cd35cf6bd))
* Cluster record UUID search [DCB-1999] ([9f42dbb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9f42dbbb2cc9825ef49e798a2b04495bc8b8f7e4))
* Combined request modal for one click requesting [DCB-1999] ([f0aaef1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f0aaef118068f1a7ba506637aa5324b01be26b48))
* Improvements to search [DCB-1999] ([1cb4201](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1cb4201c88cba7bcff99561d9d6055f328204e57))
* Library mappings edit now regulated by consortium [DCB-1995] ([6fe6a99](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6fe6a9922363d8e08a7d6229897e1857b8a2d33f))
* Search results now show live availability info [DCB-1999] ([eab2edb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/eab2edb40f9e2ca16aca378ce52667468613c187))

# [1.1.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.0.0...v1.1.0) (2025-08-12)


### Features

* Add feedback link [DCB-1836] ([5b68469](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5b684696d3248e0db3b8443560f8b0895ee3c1f9))
* Introduce supplier requests page [DCB-1982] ([86b3a78](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/86b3a7878a1a040371d3c926018beffd0798578f))

# 1.0.0 (2025-08-05)


### Bug Fixes

* Add missing no results text [DCB-1841] ([3013abe](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3013abe31cb0d13bd40831b6ac2559d878421565))
* Ensure library name is displayed in header [DCB-1836] ([9a896a4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9a896a488fb992b31355b5db60f974d1724ffcba))
* Fix active tab indicator [DCB-1836] ([0d11e1b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/0d11e1bdcf3ee46c084f6f4603853d71141af347))
* Fix for 404 refresh issues ([080da88](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/080da88e309699e3cc166fc9a64f9e8270c4b034))
* Fix for some routing issues [DCB-1842] ([6b865f3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6b865f38baae3104d20f5e70606ccb5fd1c5ab77))
* Fix form default values [DCB-1836] ([44d5bf5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/44d5bf5cb80f89b744a5ac4f969cb6e3b8c07d5e))
* Fix Keycloak ID issues ([d6d29a2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d6d29a223e55171d320ea37bc61542f00b07e62b))
* Fix patron request grid re-renders [DCB-1642] ([8f43b64](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8f43b6405a64b05985c62bf78cbe428398b62634))
* Fix tab indicator for dynamic base paths [DCB-1836] ([82469c1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/82469c10ae3506c83d965922520b75c774b87c76))
* Lock down filters, fix column persistency [DCB-1842] ([e78edea](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e78edea496d41567af25cf2fbb392a966a368118))
* Pin tanstack router to stop type issues ([7c1046a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7c1046a122c60239632a22e6495f96a869001d52))
* Prevent continuous live availability requests [DCB-1841] ([726d034](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/726d034362532a4259eb172414963ac5faac7c98))
* Redirect to user's original destination on login [DCB-1836] ([df8eb8d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/df8eb8d1e59973aa5411110b08fba574ddb30fae))
* Use environment variables for custom base paths ([63b4eaf](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/63b4eaf1e0018b9eecb461b98fe14bea9e94208e))


### Features

* Add additional routes [DCB-1837] ([f336043](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f3360433d118beaa3374e0947051632678f962f8))
* Add staff requesting and expedited checkout [DCB-1841] ([79c266f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/79c266f57f356badaa8631847f5fe84f1a160403))
* Basic mappings page and types [DCB-1836] ([e60a017](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e60a0174f41347c655b0432dfb63d7c740061eaf))
* Dark mode support [DCB-1841] ([b842c3a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b842c3a5ecc354a30fde513631a4a17e3cc40ba8))
* Define basic routes and initial Vite setup [DCB-1837] ([b5bb3ae](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b5bb3aedae76df0f1259c834363e1da7f800e543))
* Display basic grid of ILL and DCB requests ([b86100d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b86100d31a002fcab72aceb8cc6d7fc413a32102))
* Fix auth, add components and shared index route [DCB-1837] ([78b3580](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/78b35800647f838f83f065be114ed79e293c8c8c))
* Implement basic editing [DCB-1836] ([d29a502](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d29a5021ab225092ee63f02a8759b8d2077755e4))
* Implement basic i18n [DCB-1837] ([c51cf44](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c51cf4483ba01a21e9365a614bdc2f2549d33050))
* Introduce audit log entries [DCB-1842] ([79c4204](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/79c42043e232d59c496ed9b823093d59f22e1103))
* Patron request and audit grids [DCB-1842] ([03642fb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/03642fb2d5ae436ff590372dd8f461dd7040c085))
* Patron request page improvements [DCB-1846] ([e037eba](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e037eba33cac203d29f2ab5fb8e43581bcde1411))
* Support for editing mappings [DCB-1842] ([f87106c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f87106ca96d7dfe561502168e24fe69487386a07))
