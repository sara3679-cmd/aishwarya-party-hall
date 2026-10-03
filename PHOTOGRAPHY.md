# Photography

Customer gallery: `/photography`. Each approved portfolio has a shareable page at `/photography/PHO-…`, with sample work, photographer/studio name, services, suitable halls, availability notes and packages.

## Set up

1. Sign in as administrator at `/admin`.
2. Open **Manage Users**, create a **Photographer** account and enter its WhatsApp number.
3. The photographer signs in at `/admin` and opens **Manage Portfolio & Packages** (or `/admin/photography`).
4. Add a portfolio, 1–8 sample photos, and 1–6 packages with coverage hours, inclusions and optional prices. Photos use the existing automatic resizing workflow.
5. Save a draft or submit for approval. The administrator opens **Photography & Approvals** to approve, request changes, feature, hide or reorder portfolios.

Photographers can access only their own photography submissions. They can view booking information with the same read-only permissions as viewers. They cannot edit bookings, see administrator-only financial details or publish their own work. Changes to an already published portfolio remain private until approved; customers continue seeing the approved version.

Customers choose a hall and optional event date before opening a package enquiry on WhatsApp. The message includes the photographer, portfolio reference, package, hall and date. Availability is confirmed by the photographer; it is not a live booking calendar.

The photography catalog is stored separately from decorations. The D1 and GoDaddy MySQL adapters create their catalog tables automatically. MySQL staff-role support is updated through the existing staff schema setup, and full database backups include the photography catalog.

Use the existing GoDaddy deployment workflow to publish. The project synchronizer includes photography pages and retains the production MySQL adapter.

Validation: `node --test tests/photography.test.mjs tests/decoration-photo.test.mjs`, followed by the GoDaddy production build.
