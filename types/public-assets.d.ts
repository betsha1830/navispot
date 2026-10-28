// Ambient declarations so a standalone `tsc --noEmit` passes without the
// gitignored next-env.d.ts — Next regenerates that file locally, but CI
// checkouts never see it. Declares *.png/*.svg/etc. module types only.
/// <reference types="next/image-types/global" />
