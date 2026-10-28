# [2.0.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.13.2...v2.0.0) (2026-10-28)


* feat(cleanup)!: restrict clean up to the supplying library, and check for updates first ([db697e2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/db697e2a69ca8cac2cf66dd1b65a61d2e3c0ba36))


### Bug Fixes

* **a11y-gate:** reveal the deferred panels by polling, not by a step count ([5e39919](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5e399190e2feb3fee6d9f6d3c1c474e8e4bab44a))
* **a11y,auth:** say what the accessibility gate covers, and only return to this app after sign-in ([179e045](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/179e04522e0981a95811469dc0c106dba086729b))
* **a11y:** a failed requesting search is reported under the page's heading ([5cce2b5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5cce2b51380525ce1bd22a808419039b5df9af8e))
* **a11y:** a finished bulk cleanup is announced, and its sections are labelled ([3e3cf4e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3e3cf4ebc171f3936b8dc753b9bd8b0e425927a7))
* **a11y:** a new page of requesting results is announced ([c009f7a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c009f7af2408aaac32ce2f69353454f4f5c4acb7))
* **a11y:** a request's libraries show their ILS and contacts as text ([ac7c1ee](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ac7c1ee6e8c8d09dc5974ef4a1ac66cf4a74a25f))
* **a11y:** a search result says why it can be requested, in text ([ed11835](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ed1183587cdeb58996325c9bd6c981886be96b15))
* **a11y:** a staff request moves focus to its next step ([72d7add](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/72d7addc10b7b64242d55bf25db0370a709f6486))
* **a11y:** an audit entry is headed by what happened, not its id ([2562c74](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2562c74a56b44e1b9843cc4221c1ab18a5485341))
* **a11y:** an empty field is read as empty, not skipped ([70e3592](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/70e3592d57162f46a5cd16adf79b07bb0679785d))
* **a11y:** an Insights figure's change says which way it went ([8d22d61](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8d22d6141e6f164124c649b36abf7907763c211e))
* **a11y:** announce a navigation, and move focus into the new page ([8f3924f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8f3924ff766f8f0f7bb07c5999ed8a9a3d1b2a2b))
* **a11y:** announce how many titles a search found ([e68cb5a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e68cb5a2a2e0aeaddc0275dba881761d8f8dc55c))
* **a11y:** attach every field label to its value ([7726730](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7726730b1c77510bbec85d98f4c1e3027526d13a))
* **a11y:** error.main was 3.85:1 on white, so every validation message was ([c428699](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c4286995187fa31cce372c8bfbb799669887efdf))
* **a11y:** errors no longer dismiss themselves on a six-second timer ([d747787](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d747787db8d90a16c6267c693c3d8982e235b985))
* **a11y:** five aria-labelledby references named nothing ([45f186d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/45f186d5c7c2b9f1e8dc9d6e76330fc30f2762bb))
* **a11y:** give every data grid an accessible name ([398b579](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/398b579f1f4efcd24f08b6eec0ab1f42acad9c47))
* **a11y:** icon buttons show a focus ring ([b40ffd7](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b40ffd7cc87524c45edb4d82ac066601c03c4e13))
* **a11y:** Insights tables that scroll can be reached by keyboard ([4cc0851](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4cc0851faa28796db9fe7d6dab7a4c655686b8e7))
* **a11y:** make grid rows reachable without a pointer ([972a1f8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/972a1f8a0a2de41a151970248c7afd1782a58823))
* **a11y:** make the theme's heading variants actual headings ([80e834e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/80e834eda865dd6f9473c81a336fdb1ddfed4458))
* **a11y:** only a success message closes itself ([555a8f6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/555a8f6f8cc3acda1c89e0e58f4eb8278f476f38))
* **a11y:** page buttons stay on screen at 320px wide ([5f97ba5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5f97ba57817884f1fb17e5fc48eae048d5cf346e))
* **a11y:** record and staff request surfaces pass the axe scan ([cf36942](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/cf36942fdca2e6bd9f25f3680ccb14e8990e6cf0))
* **a11y:** saving or deleting a saved filter is announced ([79f7017](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/79f7017fd5401729d36deb5a5f281c4b0c6bb31c))
* **a11y:** Scan the whole insights page, and fix the two contrast failures it found ([dfe1ab4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/dfe1ab4dea1a0933bda50120aacf87a490bfdfa3))
* **a11y:** search results are a list, not a one-column grid ([2c826bc](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2c826bc3e1f1ad30fe0054a0007f8c6d85cd4c05))
* **a11y:** step numbers were 3.36:1 inactive and 2.24:1 active in dark ([d2a313d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d2a313d253cc491e7bace7e76951df12995e4a49))
* **a11y:** tab ids, tooltip names and heading order on the record pages ([3a52358](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3a52358fdec26fe8e41c11787678b1be913c6245))
* **a11y:** the brand image's hidden file input is no longer a tab stop ([4c3dccb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4c3dccbfcb5d981e618ff954989ebc98d7bb5588))
* **a11y:** the Insights date range fits a 320px screen ([9e548da](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9e548dae6b65bae06b695694e4fcae2ae53fd57e))
* **a11y:** the requesting dialogs' close icon meets 3:1 ([ea31c92](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ea31c921feb88297b2c74c954937d424595a2db1))
* **a11y:** title the maintenance and network-error pages and make each a main landmark ([29a072e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/29a072ecc45c4a5e54b66cf7e3b4f185222f52f6))
* **announcements:** list a library's notices newest first, as patrons see them ([956a5be](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/956a5befdffd578ff689078477a1e0eccd00e07a))
* **announcements:** make each listed notice an h3 under Your notices ([6017ee9](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6017ee9d12a229e2202f638e33c1f1c18c36cde0))
* **announcements:** reach the configured API and publish in local time ([b264edd](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b264edd52f51fe58b415c4ac1e3517c22f326a36))
* **audit:** "Return to patron request" goes back to the audit log ([ebd5790](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ebd5790f797c35fffccb26fce7f80a109f9061ef))
* **audit:** survive a missing request relation; typed navigation; layout ([ae7dd43](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ae7dd43f2782639edc3ce923cc8cb4355df6d84d))
* **auth:** a read-only user signs in again to the record they were reading ([d1abca8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d1abca8fa6200d4309de8f508e1411c11ef0b206))
* **auth:** full access is a library administrator's alone ([6f3eb14](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6f3eb1460061e96cfd28d14fbaeebae22ea11e41))
* **auth:** keep the access token out of query keys ([aecbfc6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/aecbfc6128ce1feae0b43d41801ff310dc91bcab))
* **auth:** make the route guards decisive rather than advisory ([3bce06e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3bce06edd8e4f3076ce8d1666188999c1a994d53))
* **auth:** stop the sign-in retry loop and show sign-in failures ([11e5472](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/11e5472531cbf5e6d246a009edaf5ebac1fec3d6))
* **availability:** a member-library outage is reported on the record, not by leaving it ([e4f53fa](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e4f53fa22875eec07f3413d72618667bca911fbb))
* **availability:** one cache entry per question, shared by every caller ([5018c35](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5018c3559e30d0013b65f01b017f0cc914b605dc))
* **bootloader:** the header logo loads when the KI bootloader mounts the app ([be4ba3c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/be4ba3c631adad7c93ae15cea969f535eb637501))
* **branding:** drop the consortium image fields this app never asked for ([d1b34d1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d1b34d1bd6e566a9ee1e968a8d731a9d36d75b6a))
* **ci:** a suffixed section number is still a section number ([2d1fad4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2d1fad4073d8bfced18be504f08d1f22af44a48b))
* **ci:** scope each naming rule, because plan references belong in a commit message ([724a5e5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/724a5e50efef833718e977ca4937c7e9b4f166bf))
* **ci:** the message marker works per commit, and findings name the commit ([ef7f0cf](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ef7f0cfd66eb3ecb95266bf04b02c3a094fdf615))
* **cleanup:** a bulk cleanup refreshes the requests it cleaned up ([2aae105](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2aae10513a749c61330529dacf0823318f427904))
* **cleanup:** a bulk cleanup's results can be paged through ([87af53e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/87af53ef22d98bbae37de9e0807b56346ef35e96))
* **cleanup:** a failed clean up says it failed, not that the library is not a party ([a99c8c4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a99c8c40f14a7a0aed92c4e648c3153f6c9b7b8d))
* **cleanup:** a failed cleanup says what is known, not a status it may not be in ([5b35680](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5b35680cedd3693ee5e3e3a6f087545e56d058f0))
* **cleanup:** an unanswered library lookup does not take the request page away ([ac7bb4d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ac7bb4d0cd00136de371d8e38791e585183a9f28))
* **cleanup:** ask before cleaning up a request ([66dd49a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/66dd49a43a9ee9def3829f26040664eb0337bc85))
* **cleanup:** list the requests a bulk clean up was refused for ([eb7ce55](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/eb7ce55dc8db978835284b37ad64b390506b336f))
* **cleanup:** name the result dialog, and settle what axe could not decide ([7ec4352](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7ec43525d1c3a50dc8dbfcafec184240bbbe6875))
* **cleanup:** offer Clean up anyway only where force can answer the refusal ([9a64f58](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9a64f58b4f8c92320b5975755ec30e51dbee9f91))
* **compatibility:** dcb-service 9.2.0 serves announcements, the support link and walk-up ([8c8ab41](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8c8ab410e043151bb5563f5089cec3e193ac71fc))
* **compat:** Name the schemas' provenance, and re-point the target ([f52dd60](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f52dd60692709d7a18ce222abadc3753fd837084))
* **csp:** no eval probe on page load, so a strict CSP reports nothing at start-up ([b8ce4d5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b8ce4d5b7903eae4176c830bd4acbfcacce49df0))
* **deploy:** leave the missing-chunk reload to TanStack Router ([705640c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/705640c5e45bc7ccc668564c1f8ee65e3c9d2943))
* **deploy:** reload once when a deploy has removed a lazy chunk ([486245b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/486245bc682a71b5ec7a0d67387effc5c3864f13))
* **deps:** clear the two high advisories and gate production dependencies ([b9122f3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b9122f37987c6725c9d7b35bc5026194be9093f3))
* **docker:** build on node 24, whose npm can install the lockfile ([d80dd55](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d80dd55827de1c31fe8078eb16e2e35398743e02))
* **errors:** a failure the page can explain stays on the page, and an expired session signs in again ([befa8cf](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/befa8cf2ebc4dc3900331ef9fd6115d76b40d517))
* **errors:** a query from a page the reader has left does not send them to the error page ([52d1a26](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/52d1a26985be632972ecd590158c3ed4bd20a796))
* **export:** a failed export says nothing was downloaded, with the server's status ([61c62eb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/61c62ebe841e4bce5fbfc0b1acc62bb38ced6428))
* **export:** a select column is written as the label the grid shows, under a true header ([0c8c5a8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/0c8c5a85083d5b3a3650f8d04248550ed5427113))
* **export:** bring back 'Export all as TSV' on the request grids ([534ba9e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/534ba9efa5e67df84ee98886533cc85584609e4a))
* **export:** CSV starts with a UTF-8 byte-order mark ([7a48eb4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7a48eb4b4ea35b6908928e6ce3082e75b24ca26a))
* **export:** download nothing rather than a partial or empty file, and stop on leaving ([573a2d0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/573a2d047c287227486b60bac11d51498eb7c253))
* **export:** drop the 'left out' count from the export message ([45d9c41](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/45d9c4121f03195d4e3c8900446193998f4bc536))
* **export:** Excel date-times on the clock the grid shows ([af9c455](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/af9c455a4402dd30dc57227a8edf4cac9b71e042))
* **export:** fetch a patron's barcode only for an export that chose its column ([7627a32](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7627a327c81e76068b9c5273343571c8e1beed5a))
* **export:** report real counts and progress ([691cc35](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/691cc35633310aa44d1e3c8232810889c7b6de80))
* **export:** say what "matching the current filters" covers when nothing is filtered ([12016a3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/12016a3cb72062da592f216f46872f6fca50a6a3))
* **export:** stop exported cells running as spreadsheet formulas ([3583f60](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3583f60d64e5aafa96d151fa1319117a21a595fb))
* **export:** the progress dialog gives focus back to Export, and only Escape cancels it ([63df1ef](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/63df1ef9e607f1e8214c7d58dbddf9e485f44f7c))
* **export:** the wizard exports the filter shown, and its errors are heard ([3c69aee](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3c69aee94cacf9eb4579c87ffdf4d00fe1379d23))
* **filters:** "Remove all" leaves no ?logic=or behind ([1770a20](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1770a20d7de03eccb4053b355ccedfc48df27c46))
* **filters:** a date chosen in a picker reaches the URL and the query ([d92114b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d92114b6968cacc601fdd10d25f551d3341bdf03))
* **filters:** a true/[secure] choice for the yes/no columns ([60eaa48](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/60eaa48785c550555390eb2c3a4f7a0a0d8fb35c))
* **filters:** keep unfinished rows, cleared ranges and non-dates out of the URL ([4129073](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/41290738f55c60cc8c7fdd3a5cf7a22dee6821e4))
* **filters:** queries that keep OR across a negation, a pasted tab and a bare keyword ([21a9779](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/21a9779572719e9a24635084304385fa0abdce15))
* Fix CI gates, i18n and testing ([9fd6762](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9fd67620037dc88df21ae2a4850687a09b354838))
* Fix issues with base paths ([06c7d99](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/06c7d9989db359dd0715639b87d89aa34ab8e9cc))
* Fix routing issues, and add "not found" and "error" components ([867d934](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/867d934f72905a78bf4cf1ad0a7b61bd1a5cc75f))
* **gates:** set CI=1, because the runner was inventing failures ([d2e6d25](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d2e6d25541577db3b6ccb3135417a60427d2695a))
* **grid:** hold every page size to the 100-row bound ([77256eb](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/77256ebffe23547b2ea37b637b1c66efcb4d1494))
* **grids:** a link's patron barcode filter leaves the address, and the reader is told ([4783a18](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4783a1816afddf0ad0168430ba7356e578d60cb4))
* **grids:** an empty grid says what it found none of ([619a02b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/619a02b96196e034608ebf2dfe17e30a7ac0964a))
* **grids:** Back to a later page under another sort keeps that page ([b5f2ca4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b5f2ca4bb89951f8f307cdef25cb6edf7d2bf25e))
* **grids:** count selections honestly, restore the cell focus ring, announce results ([7f05f97](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7f05f9778e7e5ca4bc26012ad79be4a828740d35))
* **grids:** date filters use the clock the reader chose ([8f5d83a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8f5d83afe85c71f81bb5ac3f91fcbd8a88204483))
* **grids:** describe filters in the grid's own words, counted as MUI counts them ([e97be73](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e97be7352064029c654ec4e80b8fe4fea804e4a2))
* **grids:** escape filter and search text before it reaches the Lucene query ([69c1ccc](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/69c1ccc245228e635323698f218fed901be3822b))
* **grids:** escape the supplier grid's own scope query ([d138c97](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d138c970d577db871fba0846ef5f69a387873d0e))
* **grids:** keep requester-note filters out of URLs ([f21864f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f21864f2f0bc87c4edc6d8a439167073bab43c46))
* **grids:** let a grid scroll by wheel, trackpad and touch ([ef96f31](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ef96f3166cab45647bc2ff0e50c1b2deb1e47228))
* **grids:** request grids load what they need, scoped once, labelled truly ([df496d4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/df496d42ae6bcf87545570dadfca4eddde51e6a3))
* **grids:** survive a request with no suppliers; stop offering unsaved location edits ([424a0e3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/424a0e3d8bfe267d504464111785723d19726d20))
* **grids:** the copy-link alert shows at the foot of the window, on every copy ([9f920b1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9f920b109142cdce226e27846a8249ec5f0d0324))
* **grids:** translate the filter operator labels and filter summary ([4f52c2f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4f52c2f0f669f7b673b7b4309bec358f9ce8b512))
* **grid:** tell the user when an inline edit fails to save ([5245862](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/524586281be7e7ed265e88d68fd746a74c531257))
* **header:** wrap at narrow widths, keep the selector legible on the bar ([16e262e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/16e262e10a95018ff8c43b4470a691392e0db6d2))
* **home:** a sign-in with no library does not show another library's ([79ba358](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/79ba35895e0a8756c5ac464c95e925e575c29d4b))
* **i18n:** a quick change of language ends on the language chosen last ([888402b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/888402b03364d383bd5db1d244529c0a93e7e4db))
* **i18n:** counted text agrees with its count ([414fcaf](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/414fcaf4f034e6c20369e0aad7ddb50c3449de1a))
* **i18n:** each release-notes link is one string to translate ([5fad451](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5fad451c0e03cc8cef1dee0130381717fd1e1503))
* **i18n:** format numbers, currency and dates through Intl ([cc99b7b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/cc99b7bda3e2898c22340a56a27f15175b4d89d9))
* **i18n:** name no internal service to the people using the app ([05ec1a7](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/05ec1a7028425830c3c3a84de06dedc539f30dcc))
* **i18n:** restore two labels the dead LanguageSwitcher still asks for ([da0df0f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/da0df0f3229cedb4c50ce907179f937e789d7d00))
* **i18n:** translate the 100 hardcoded grid column headers ([d8359db](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d8359dbccf7780835d23b9882da61088487fe379))
* **insights:** a custom range changes only when a real date has been typed ([e918232](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e9182325240cc85a4f294ee2a61a25f94a0bdc05))
* **insights:** a metric's explanation stays on a phone-width screen ([37d8184](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/37d81840b70f571ba2536f51a90b21523a095c77))
* **insights:** a table panel's CSV states the method behind its figures ([3f5bd91](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3f5bd9104b1508425396c6bb41f8ee5cb8b6909c))
* **insights:** a trading partners timeout is a failure, not a collection count ([2e12ace](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2e12acefa5cc9ec16ba22a1bfed55b7ccaee5783))
* **insights:** an impossible acquired-since date no longer takes the page down ([c84ff1b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c84ff1bcda2fdbd05bd24cb54fdeddffae03a0f9))
* **insights:** announce the range through the application's one live region ([9133485](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9133485f64b68f97e93c0e73f1b2b977558f6754))
* **insights:** apply a custom date range, for the selected library ([ff599a5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ff599a5ec9d34002ecf36544c83da568968fac0e))
* **insights:** draw charts in the dark palette in dark mode ([41eff82](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/41eff820fd8c56fbd8c9f1f09412c99d22055def))
* **insights:** Gate the home-page summary cards on the same flag as the dashboard ([c9db3e5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c9db3e53a86318d70b6d00588b3011dc7dc60934))
* **insights:** give clustering confidence and format mix their data tables ([5e49f5e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5e49f5e97faec5e9fd693f42fcc5f62422ddfc00))
* **insights:** give the date range picker the data grid filter's fields and actions ([8e3752e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8e3752e96d7aa43fbed6a4a58684a9368ba7ff5f))
* **insights:** give the five remaining charts a data table ([eac05cc](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/eac05ccbf377ae66126c50b6527a51cdc95ef6d7))
* **insights:** keep a failing collection or unfillable-demand panel on its page ([61e20e8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/61e20e8901a1517cf53e351bd379e0fb06066d82))
* **insights:** name the heatmap's days correctly west of UTC ([bba72fe](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/bba72fe4a6d1a40456bb83a4a220b975676193ce))
* **insights:** Send the library filter under the name dcb-service binds ([f878dd1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f878dd1e8fa0d127bb33eca3f6f1fa1d2d566792))
* **insights:** show how unfillable demand is calculated ([37f965b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/37f965b8ee60623177863d10ad1aa6fd781205c0))
* **insights:** start trading partners on its first page when the range changes ([1133cf4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1133cf415baf29fd6dbbefc1cdaace1118e4f810))
* **insights:** the activity chart fits a 320px card, and names its statuses ([dd15e7f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/dd15e7f47fdd90ed07ecd5ed2877226afdf2f4ed))
* **insights:** the most requested titles are told apart by cluster, not title ([fac8059](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/fac805947d16f71fefaee8069e3c247a2f786453))
* **insights:** time charts name each bucket by its UTC day ([e79c216](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e79c21632ce9daa2cd264cdecd9408da175d81dd))
* **insights:** walk-up panel behind its own flag, and its failures reported as failures ([8d7761c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8d7761c8259544e2bb835db6ab978c168c0bd45a))
* **insights:** walk-up, trend strip and title-table figures through the shared formatters ([9a64fee](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9a64feedd0e9ce19d7f854d1dad64d02d34ac11a))
* **insights:** write collection and partner figures through the shared formatters ([de6a9e5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/de6a9e561d4d476da706c2eeae1a8b414dcaa3bc))
* **layout:** a detail page's attributes fill the row on a phone and a tablet ([207582a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/207582a9adc75065df21e4bd928bc51c9ab72057))
* **layout:** dialogs use the width of a phone ([c76689d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c76689d8863f9f3ce2085913dffb145373628896))
* **layout:** drop color="primary" from the navigation Tabs ([80cea04](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/80cea047e45505ee44a5101c2ec4c3dd367f3655))
* **layout:** the main tabs show they scroll on a phone ([25848d5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/25848d50ac6b7cb3d243e32ceb8267b86a924893))
* **library:** a renamed library shows its new name everywhere ([964ec76](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/964ec76d953083d4f869c3c185f7bf62869e8f95))
* **library:** an edit is not carried over to another library ([f022783](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f0227839f64ef8d0f8e8c14542ee4bd03323118b))
* **library:** ask before dropping unsaved profile edits ([4115f2c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4115f2cea515e5a73b37c52375a5887003577af9))
* **library:** let a library with no coordinates save its profile ([a341e26](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a341e262167fee11e95fa46e8ec03f8d0d07c053))
* **library:** name each editable field once, not twice ([2fc8c7f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2fc8c7fd6d996f19ce206f64d0d33393a4258100))
* **library:** remove twelve colour props that never applied ([193b919](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/193b919e4e0393a9cae12fee8d64620bc5c68804))
* **library:** show the leaderboards on 8.71.0 from the legacy stats routes ([4e54b2a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4e54b2a22662f541665d269ab8ab58c772370614))
* **library:** the abbreviated name's error states its real limit ([16fe25a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/16fe25a6979db97f9c6924102f0f203567072ccf))
* **lighthouse:** announce the preview as ready, so lhci stops waiting two minutes ([37bf786](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/37bf786b05f0f444a174f20ce7b658f957fd1844))
* **logout:** finish without a session, report failures, title and landmark ([6bf9ff4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6bf9ff49953e10f8d5af43be35591586e2ce8f37))
* **logout:** forget one person's library and cost assumption, and stamp each build with its commit ([8be9f6b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8be9f6ba624d1eade9b744c7847d95481376b99e))
* **mappings:** no keyboard editing when denied; reject blanks; show why a save failed ([98da93f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/98da93f347989a4c44c78924e50056ed3d6a6dce))
* **mappings:** send deletions as DeleteEntityInput and report refusals ([ca17e9f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ca17e9fcc9ea1c3fea5824d4a16bf50a6c1a5178))
* **patron-request:** look the pickup patron up by its id ([3fb8c13](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3fb8c1302d566692d8caa2c09c8ed3bd93417b4d))
* **patron-requests:** a refused Confirm item is back stays until dismissed ([f93e225](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f93e2253af076a4dab395580ced18ca9db771629))
* **patron-requests:** Confirm item is back is served by dcb-service 9.2.0 ([1ea0da2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1ea0da25d5b96b40dd90e6da851f5dfab8066e21))
* **patron-requests:** fetch the pickup, walk-up and renewal columns the grids offer ([d707478](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d7074789376671c37a6e0659689ffabeec16b82e))
* **patron-requests:** name statuses as the grids do, not by their codes ([fbf5408](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/fbf5408a9fbe2d66f27f97ab0bbac79e4d9aa8f8))
* **patron-requests:** remove the administrators' title and publisher filter ([bc7979c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/bc7979ca916eea938ec4d9b0bca7bf10f1c46b6d))
* **patron-requests:** report a refused cleanup or update as an error ([903949f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/903949f5a225fe3f70d7bc11a1bc028f39d59267))
* **patron-requests:** show a pickup patron only when the lookup is certain ([6384f5e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6384f5ec9fe364c2016eab1383169e29bc894317))
* **patron-requests:** the audit log shows what an update or cleanup wrote ([cef7e5a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/cef7e5a042450ff856d0ef075e24c724bf6a4986))
* **patron-request:** survive sparse requests; keyboard audit log; visible reasons ([bc8335f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/bc8335fd44580daab057288a188616ce617248bd))
* **profile:** keep edits through a refetch, save a staged logo, show load failures ([6d007f8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6d007f810ec0cf196c586725786f55e5218ea785))
* **queries:** cancel a grid or statistics query its page no longer wants ([624a149](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/624a14950ec1644e1985511199a44db1792f5bc3))
* **queries:** retry only a failure that may pass ([eed8b28](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/eed8b2854d8b72596c89629b4450110ae4a23089))
* **records:** bib and location pages for missing, odd and unnamed records ([77223fe](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/77223fe8413bce985e1e64324a4c15659eafe1d6))
* **records:** reject an address by its shape, not by uuid's version check ([e433ee9](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e433ee99336e8b1a263520e1f329c2c0433c24e2))
* **release-highlights:** do not tell a new enough service it needs upgrading ([8e703f0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8e703f08de18092a00a9c2ae38ac2c944a7b31a1))
* **requesting:** a placed request appears in the grids straight away ([e7adc1f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e7adc1fd70edbe0382fb65d423de66ed5dfe85be))
* **requesting:** a refused request always says why ([018ece2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/018ece2717e17aa2f348cab64ca6e3575e290c9e))
* **requesting:** a walk-up shows its own copy's due date ([c3340b0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c3340b0026c9163598fb3c9270a07554fdad2b66))
* **requesting:** an on-site request's description separates its note ([df6cf44](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/df6cf443d809bf36ae908c2c1b7244fec88c9733))
* **requesting:** changing the item library clears the item chosen ([d4ef604](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d4ef6043a057d789b3073e84fd96180d108ac5f5))
* **requesting:** each record's items grid starts from its own first page ([d5b979e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d5b979e735aef610a6988a1675204022b52ca21a))
* **requesting:** give the availability fan-out an explicit retry policy ([f896ed5](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f896ed51103a84a87458d825348359c2721bd74a))
* **requesting:** items grid pages past 25 and reports failed availability ([a50f8b6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a50f8b6f9a6b601dbe59c59036758081ee453a18))
* **requesting:** name a copy's volume as the library typed it in the item pickers ([e63bf4c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e63bf4c0b54c5cf1c7d324b029ccaf91d9ef896b))
* **requesting:** record pages reject bad ids, title themselves, and say why requesting is off ([12f5ea1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/12f5ea179ec4f3ec2b7c96ef0b7aefd889ca14e0))
* **requesting:** request forms validate on Enter, show the due date, and stop polling ([120a0e2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/120a0e22e3afd2efeebcb4de96c4bebc023aab78))
* **requesting:** say plainly when a request was refused for taking too long ([587a6f7](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/587a6f7afc46c60b8f443fe2df67caaa388368fa))
* **requesting:** scope a record's request history by agency, as the grid is ([443af3e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/443af3eda0717095d273ee00bb38b0487f427c16))
* **requesting:** validate the search URL and keep the page usable at 320px ([f5a308e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f5a308ebd85c33b8248358df5d0da0ea1654576f))
* **requests:** the request page's open tab is in its address ([bf53a77](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/bf53a77ec0ad29f7680de00b0fdf861143d9ec84))
* Scope discovery links so they only show up on relevant envs ([c1ebdfe](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c1ebdfefb9beb0338b799477375a3207882dea52))
* **search:** at most four availability calls in flight per tab ([00d6973](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/00d6973f90d58be6aa2315c0efc2aca092e2fdf0))
* **security:** fetch Host LMS credentials on the service page only ([951f6c3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/951f6c3870b17922207dc2be1a8461164e6767c0))
* **security:** load only library names for the header and library selector ([7bac11e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7bac11e64ce9818f8c220b7eeefe2179c3f2db31))
* **service:** a credential field no longer widens the page at 320px ([147845c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/147845c305fb1de5a417e28e32efda96331c7e74))
* **service:** heading order, grid overflow, phantom values, loading and error states ([2078d82](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2078d820827a86b138809cec4dc551c93f95ea22))
* **sorting:** one column, no [secure] "unsorted", visible defaults, and dates as dates ([d020e27](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d020e2772ca94781c08bb1c82f62af2e15def9f3))
* **statuses:** AWAITING_RETURN_TO_SUPPLIER has a label and can be filtered on ([8012ffe](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8012ffe8f36dbe1a6411812af73c67a84a2acbda))
* **theme:** draw the contained-button focus ring in the outline token ([388cbae](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/388cbae8f4e291e0497ab802ce7cb9be713bf6f3))
* **theme:** keep dark-mode contained buttons readable on hover ([10a0546](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/10a05464ea193b6a999431fbb5f738834b894392))
* **theme:** one rule decides the navigation ink, and it is the one that passes ([5c51572](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5c51572f7c905dd0d7e8eff12654b65cce8f6baf))
* **theme:** the dark search result title was 1.59:1 on its own card ([c3f4a7b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c3f4a7bcf23f4f3bd216fdbde9059f682daf093e))
* **today:** what a QA audit of the page found ([4412933](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/44129333f4eca3f156d478ef5c5fcfc45189d697))
* **ux:** destructive actions confirm, and say what they will remove ([6af2696](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6af26969caf10f11597e9b449bae066afb97444d))
* **ux:** no unfinished welcome while the library is unknown ([093b191](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/093b1914613858ea0c190b452f4fa32619c90e8f))
* **ux:** one word for walk-up, and one for clean up ([356351f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/356351f0a14cd33fb363ef9d073b72f1328d039f))
* **ux:** Submit says what is missing rather than staying greyed out ([ae6b396](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ae6b3963cd4796c322bb917461b9c464d0e2a16f))
* **ux:** Tell your patrons says so when it cannot find the library ([37a8ddc](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/37a8ddc1817f0b1c65c9025424847831932a234e))
* **ux:** the library page greets a user with no name as the header does ([1d5e5c0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1d5e5c0c8b4915bfe6c2f406bd5ebec860fb78ca))
* **walk-up:** say when the item is already part of a request in progress ([484e0a3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/484e0a321ebf7524d656ad11752ad757ae5cada1))
* **walk-up:** send patronAgencyCode and the patron barcode, and say why a walk-up was refused ([e2bee9d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e2bee9dd8e061bc358b23752efa6bcc9a75db665))
* **walk-up:** send the field the service requires, and say why a walk-up was refused ([4f3887f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4f3887f92f07bb3291570158f7fd377842540597))


### chore

* **licensing:** declare FSL-1.1-ALv2 as the package's licence ([2fc7ed8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2fc7ed869b24a581abd756f0a4ed268d740613d2))


### Features

* **a11y:** add a high-contrast colour scheme at AAA, and answer forced-colors ([aea2207](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/aea2207e3f7f09f2400400d7791eddc5bd14e0e3))
* **a11y:** add main and nav landmarks, and a skip link ([c589577](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c589577f037f29b985e4df7955c69064ee17a064))
* **a11y:** add the application's one live region ([72f5564](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/72f5564482a7a64abf00079f8088a02913249dd8))
* **a11y:** explanations return as tooltips on focusable info buttons ([0d91f3c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/0d91f3cbeb4affe822486b27165b27433d5ab6e2))
* **a11y:** give every authenticated page an h1 ([2a11faa](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2a11faa26ea2eb395da8a6ba29d2d2495f54b8a4))
* **a11y:** give every route its own document title ([2eff620](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2eff6209df4557e7540a7e16571faee9f9f7a49e))
* **a11y:** give the Insights charts their numbers as a table ([7a80188](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7a80188975b675717fd1810587fb2a7c3ed781d4))
* **a11y:** offer a choice of typeface, self-hosted ([23895df](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/23895dfff04163bdda546fb8c948a9ff316ccd5b))
* **a11y:** offer every display preference, and make them reach the page ([22df896](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/22df896c9174ab686350731820ccca9e2ac06621))
* **a11y:** publish an accessibility statement, and stop offering a 0.4% locale ([3344e02](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3344e022fdfdd2137eb683374dc083b491ce5e2e))
* add KI bootloader publishing ([ed43477](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ed43477b4fb76de68d5489f604b47a609f711303))
* **announcements:** a library can tell its patrons something ([7de145e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7de145e597bedbeef8bfb33dea9de4c47bbe8c40))
* **bibs:** a bib's cluster UUID links to the record under Requesting ([c49804b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/c49804b3ccb3f6a452db521995731d7894f51a09))
* **branding:** upload the library logo on save, not on pick ([2b5a743](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2b5a743e9158a88c001bf3b23a576e3788ce44d3))
* **cleanup:** offer clean up as dcb-service allows it, and clean up anyway on 9.x ([03c92ba](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/03c92bac9edd180cf057bc1a659f425a6d302e28))
* **compat:** Run against dcb-service 8.71.0, on a registry that extends ([8bc04de](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8bc04deba942d2c5b317689da6945926dc55ced6))
* **display:** name the clock every timestamp is on, and let the reader pick it ([4b0d733](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4b0d733b0b4736586337942d1a524e9c4c6a4e9a))
* **export:** a library guard for exported patron requests ([3ec03c9](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3ec03c9887c943b97344f5f73cc01b6864f68458))
* **export:** an export wizard for the request grids, with Excel ([0249a38](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/0249a38c7ed46856b69fe4ad2b46dff439d99877))
* **export:** keep 8.71.0's Host LMS scope for borrowed requests, and say how many rows were left out ([d13aad4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d13aad414c09fcf83cdfa31ad95acf4012215632))
* **grids:** a grid's view reads in its address, carries its columns, and is there when you come back ([e7d6290](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e7d6290f7f80e2426cdc9f1df9a89775d2cf0365))
* **grids:** a validated, URL-safe form of each server-paged grid's state ([d5f8c39](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d5f8c397e9404ba30feb1a9e7dc34b76ed53e9cb))
* **grids:** filter, sort and page are URL state, so a grid can be shared and comes back on Back ([b471577](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b4715776c9e57af76e2bb7af04371b92293da6c3))
* **grids:** pinned columns and column order survive a link ([8966336](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/89663362631a883b0f870265805f2bd116078f2f))
* **grids:** share, save and clear a grid's view, with its URL kept in step ([e382392](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e382392cbfc912cdab22a8f4455413119d0b1c80))
* **home:** a home page that reads requests as DCB moves them, over today, 7 or 30 days ([3c23351](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3c2335113c25f1dbccabaff30b346339e78e1621))
* **insights:** a deployment chooses its Insights pages and panels ([2913b5c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2913b5c55ce291e69722a96b0786a0d1688b306b))
* **insights:** a panel that fails says so, and the range change is announced ([eea9783](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/eea9783fd0ec529b400d1f529867a365b15ca66b))
* **insights:** a panel's figures, as a file that says what they are ([a23891b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a23891bc644bb4f8cd47f093fcec0e63703b99ca))
* **insights:** collection analysis, trading partners and unfillable demand ([ed41c29](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ed41c2994988d2633bbf5da595315718c234deb0))
* **insights:** count what walk-up actually saved ([5181e99](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5181e99542f01abfe76533adf190f92e038c5bf9))
* **insights:** every figure says where it came from ([b5b5653](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b5b565338a72d7d97aa9811b4e8546b610737391))
* **insights:** five headline figures, and the transit legs finally named ([75bda92](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/75bda92d94d81f22f5bf532e51beb348ae322a96))
* **insights:** five subjects behind a sticky bar, one open at a time ([4bfb72a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4bfb72a479d8b3d73de9e68cc4bf17dd38be5613))
* **insights:** label Insights as a preview ([1b749e3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1b749e32b435c8a7c0bb10567b45ec172ca6b4b7))
* **insights:** Name the libraries in peer benchmarking ([73e5678](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/73e56784d14b3cf2c2a1dece93d8086f68943488))
* **insights:** the whole view lives in the URL ([4e79163](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4e79163c5afd851d6112da53d437388f5bcd3359))
* **insights:** trends, and the gate repair they forced ([943ffb1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/943ffb1775bb2736ab5260f711ee291ad650a41d))
* Library insights, gated on VITE_FEATURE_INSIGHTS ([63d81f7](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/63d81f75a7b8fb527ff2d1610170ef48e1deb89e))
* Library patron-facing brand form (N-1B) ([f26c12a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f26c12a539bb73823224a9823300d84f7d14deb7))
* **library:** administer the presence links a patron needs ([a3bee82](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a3bee82cf1552a69e405b3b0826b26944335edbf))
* **library:** placed by, connection checks and request limits ([6c58b14](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6c58b14dd205abd1d350a34110d83796e557d14e))
* **patron-requests:** Collecting here, the requests a library collects for others ([2faa8a4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2faa8a4d265d044f257b2787b32aa4f552b8e95f))
* **patron-requests:** confirm a supplied request's item is back on the shelf ([7460cd2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7460cd21173d6b3e399189888975810056044fee))
* **patron-requests:** explain each status beside a request's current status ([546588b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/546588b93c860673016a98b1bd02b1f524025997))
* **patron-requests:** notes on a request, written as the library ([2ade924](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2ade924ba13c8d6346850a8f0065d2cde4bc5cf1))
* **patron-requests:** tag a request from the consortium's list ([6e0c579](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6e0c5793e49a2b6e38b56bb82acec56db4dc6807))
* per-deployment locale with a per-user override, in American and British English ([4616e38](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4616e389acfd1d32bf23b063b10fa29fb796fe09))
* **pickup-requests:** call the list Pickup requests, as Feature availability does ([3291320](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/329132063c748c35a3a3502db94457ac9211390f))
* **preferences:** a shorter Feature availability list ([9736b54](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9736b540174b003f595adfac2326ead627fc4d47))
* **preferences:** say which features need which DCB service, and which this one has ([5f68836](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5f68836fadaf51300a7eff1bec527bbd28066287))
* **preferences:** Settings is now Preferences, and read-only users have it ([4d68350](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4d68350898f6f20e647a576c1b1cda9fc1d16112))
* **release-highlights:** a read-only user's own, shorter list ([3c5c496](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3c5c496855b542107e319f2c225e8c241cee5953))
* **release-highlights:** describe Home by the lists its counts open ([ab6c9b3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/ab6c9b3877ecdc87e062274e7974e2f5a04caf13))
* **release-highlights:** one item for lists, so What's new keeps to five ([1816ff9](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/1816ff9cb60b243390f7714148883463090830a7))
* **release-highlights:** Quick walk-up requests for everyone at the desk ([8996578](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/899657880cd2850eda5874ac34871c94c8479216))
* **release-highlights:** say that clean up is the supplying library's action ([b634bae](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b634baeae18c36b8e6f58188a4de8e40c173629b))
* **release-highlights:** say what this deployment has not switched on yet ([af31371](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/af31371dddc916068f1eebda7f18887a1da29a72))
* **release:** highlight this release's accessibility and display settings ([53eef42](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/53eef42b2437d6f7cce31be6e5bddedacd82351a))
* **release:** show a release's highlights on the first sign-in after it, and the version in settings ([4c5b11b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4c5b11bbaec7e5d5be116905b2a22e22d72f4986))
* **report:** a release report a reader who does not read code can use ([50877e2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/50877e2eb196a408ec2b1390fce3ac0539b8268d))
* **report:** compare each build with the last release, and name the nightly flake hunt's failures ([4271d23](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/4271d233fa8d7e2ea38e201b647764cc7a3aa51b))
* **requesting:** explain SUPPLIER_CANNOT_SUPPLY refusals ([b739dd4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b739dd44a5c3f1a3651ee58f294852e9612adbac))
* **requesting:** the search's page is page and pageSize, one-based, as every grid's is ([df12bca](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/df12bcae3eca7df8b6b2249c9c8013a364b9bef6))
* Scope a library's view by agency code, not Host LMS ([473bbf7](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/473bbf7c54223d6957c96a85ce4c541c9f150605))
* **today:** land on what is waiting on the library and what changed in the last day ([8ec5e5f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8ec5e5f152b1fdb055bd4bb96cad1a34e821478e))
* **today:** seven optional parts, each behind its own flag ([455d2fe](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/455d2fe24e91445b6cba996f9ad7bac268124a4d))
* Upload or CDN for the library logo (R-17e) ([595abd2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/595abd2902feb89f5a70cdc2c748b0e640acb414))
* **view-state:** pinLeft, pinRight, order and agg in the URL grammar ([48fd071](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/48fd0710733541ef012b6ab3f5cb37462e5f8265))
* **walk-up:** offer Quick Walk-Up to every library user, not only consortium admins ([0160b3d](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/0160b3dc1d030d023d6965b85f0ffcf59f94e0af))


### Performance Improvements

* **audit:** find an entry's neighbours with two one-row queries ([126d50e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/126d50e590e435541979a92869087b5ebda5991a))
* **build:** drop 303 KB no browser could load, and 55 KB from every page's first load ([e260009](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e260009a3432d2ece99ea233e8a635d8c834d81b))
* **bundle:** load the clean-up dialogs and Feature availability when they are used ([5969319](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/596931949336f77521ea8f222fa09af67df2c911))
* **deps:** drop lodash, and fix the defect its capitalize was hiding ([fd03ee8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/fd03ee89b18b734d9b082dd40539cf83f47aeb9f))
* **export:** keep the export's claim reader off the initial load ([8104ace](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8104acea32d087010d85d1e18891a9b18fa82c06))
* **grids:** a page number in the URL is bounded ([25c4e5b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/25c4e5bb62f50961ce32fd2716fe1414794db747))
* **grids:** stop re-measuring every row on every grid render ([f0bd5c9](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f0bd5c9bd775f5fc2a3e00d5dbb571a43aeb143a))
* **grids:** the request grids ask only for library names and codes ([2a49952](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2a4995217971b379248db62072db71866caa2457))
* **grids:** validate grid search without loading every grid on every page ([7b59161](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/7b591614422b64ea6a08c37f35c4e9b4609df9e9))
* **grids:** with agency scoping, a request grid searches once on load ([5e24f9a](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5e24f9ae1f841bde2a01ae8878cfb3bc62b80a8b))
* **insights:** keep the dashboard out of every page's initial load ([31bc4be](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/31bc4be9fa7571e1b43715549f7fb0105b80ea20))
* **insights:** keep the panel vocabulary out of what every page loads ([6039f14](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/6039f141adf42f1fd746dc30353418baf6b881a1))
* **patron-request:** load the audit log when its tab is opened, a page at a time ([8097369](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8097369fd114c6de0440ddd1bd4b87c7445df84c))
* **service:** the service page waits for a library before asking for its settings ([5266aa6](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/5266aa6e4db9e2f6b3d841bb024d5ecdbd404632))
* **theme:** apply the chosen colour scheme before the first paint ([428ec18](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/428ec1870ce570e5d7d9d6123b8915e3640a2f60))
* **theme:** paint the colour scheme before the bundle parses ([f5e8643](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f5e86438c71c696195ce218fa52102a5ccf60ac9))


### BREAKING CHANGES

* **licensing:** from 2.0.0 the licence is FSL-1.1-ALv2 (the Functional
Source License, becoming Apache 2.0 two years after each release).
Releases up to 1.13.2 remain under their earlier licence.
* **cleanup:** the borrowing library can clean up again, and on
dcb-service 9.0.0 and later a library administrator can clean up a
refused request after confirming where its item is.
* clean up is no longer available on the borrowed requests grid,
and a library can only clean up requests it supplied.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>

## [1.13.2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.13.1...v1.13.2) (2026-07-14)


### Bug Fixes

* CI fix to deal with multiple apps at root ([0d05e44](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/0d05e445135d23390d00ab5387393cbba93978b3))
* Don't allow force cleanup if library is not supplier [DCB-2194] ([487ea09](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/487ea0908293fe1d5b3010876cb713af7f167b6f))
* Further CI fixes ([2bed93f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/2bed93f001d774c073a2f41b08f19a621172f32c))

## [1.13.1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.13.0...v1.13.1) (2026-05-12)


### Bug Fixes

* Fix typo ([e12091b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e12091b76fc1358c7ad1e6c0f75ff17b0172eacc))

# [1.13.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.12.4...v1.13.0) (2026-05-12)


### Bug Fixes

* Fix for due date visibility in walk-up requesting ([3fb419c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/3fb419ce39e5528b7d419c5f78e4362c07ab15da))
* Fix issue where patron barcodes weren't included in export ([da5dce8](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/da5dce87a51babb6c5e4d2e03944a87d8f45cf5b))
* Fix supplier requests no results text ([a2db49e](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/a2db49ecfb0299f82761674a26300f74c083349d))


### Features

* At-a-glance leaderboards for requesting, titles [DCB-2110] ([b3f4f6f](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/b3f4f6fdb1f628b620798540bffbdc6dc0ebda48))
* Walk-up requesting using item barcode [DCB-2142] ([653b7ba](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/653b7ba407ee9a8a95e45d4fee23c614789b5025))

## [1.12.4](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.12.3...v1.12.4) (2026-04-23)


### Bug Fixes

* Ensure items that aren't available don't show for walk-up [DCB-2138] ([794c79c](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/794c79c237afcb250eee37e01ad50b8256f2ea7a))

## [1.12.3](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.12.2...v1.12.3) (2026-04-23)


### Bug Fixes

* Typo in walk-up payload [DCB-2138] ([8b7253b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/8b7253b668db5db1a2f5747eb4e79ef708f6394a))

## [1.12.2](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.12.1...v1.12.2) (2026-04-17)


### Bug Fixes

* Pass patron agency code for staff/expidited requests ([9aa2651](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/9aa2651f23608a0487551010a1e8bcf62ed1e917))

## [1.12.1](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.12.0...v1.12.1) (2026-04-09)


### Bug Fixes

* Fix issue with some locations not showing ([d0f727b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/d0f727be9e4864946435a60af80c4144a9e85a76))

# [1.12.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.11.0...v1.12.0) (2026-03-04)


### Features

* New title and publisher filters for requests ([f3df8aa](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/f3df8aaffc05d4728d0581b5e50d3781a4fe8ad0))

# [1.11.0](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/compare/v1.10.0...v1.11.0) (2026-02-27)


### Features

* Filter patron requests by patron barcode [DCB-2131] ([e4cf25b](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/e4cf25b452b0b7a00ac9ce295aa62938fe3daca4))
* Provide multi-cleanup and export improvements [DCB-2136] ([cb484cd](https://gitlab.com/knowledge-integration/libraries/dcb-admin-for-libraries/commit/cb484cded1a76b549f3685716cc2bc65e8dcc75e))

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
