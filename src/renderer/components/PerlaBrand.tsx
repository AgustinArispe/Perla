import lockup from '../assets/perla-brand-lockup.png';

/** Compact vector signature, drawn for navigation and small printed surfaces. */
export function PerlaMark({ className = '' }: { className?: string }) {
  return (
    <span className={`perla-brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="120 270 860 820" fill="none" focusable="false">
        <path
          fill="currentColor"
          d="M944 314C930 415 885 483 811 507C720 545 629 480 547 480C501 480 477 504 493 544C520 590 645 637 693 727C753 843 677 941 580 932C500 929 425 892 349 916C261 936 216 988 161 1037C181 931 230 839 327 809C402 784 445 813 524 851C582 893 635 865 621 812C607 747 540 686 508 623C473 568 466 539 487 493C517 438 575 403 634 412C743 421 755 443 838 415C893 395 927 359 944 314Z"
        />
        <path
          fill="var(--perla-mark-fold, #f5f4f0)"
          d="M594 480C592 558 631 606 661 659C594 609 547 581 516 550C480 525 484 501 508 489C535 477 565 477 594 480Z"
        />
        <path d="M508 489C477 503 481 531 508 550" stroke="#b38b47" strokeWidth="5" />
        <circle cx="492" cy="742" r="72" fill="#b38b47" />
        <path d="M440 757C435 710 468 686 504 687C470 701 449 724 440 757Z" fill="#fff5df" />
      </svg>
    </span>
  );
}

export function PerlaLockup({ className = '' }: { className?: string }) {
  return (
    <span className={`perla-brand-lockup ${className}`.trim()} role="img" aria-label="Perla">
      <img src={lockup} alt="" width={1024} height={1536} draggable={false} />
    </span>
  );
}

export { lockup as perlaBrandArtwork };
