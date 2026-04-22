from django.core.management.base import BaseCommand, CommandError

from hospital_management.models import Bed, Company


class Command(BaseCommand):
    help = (
        "Backfill bed numbers to the format '<room_no>-<bed_no>' "
        "for existing bed records."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            dest="company_id",
            help="Only update beds for the specified company id",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            dest="dry_run",
            help="Show what would change without writing updates",
        )

    def handle(self, *args, **options):
        company_id = options.get("company_id")
        dry_run = options.get("dry_run")

        beds = Bed.objects.select_related("room")
        if company_id:
            if not Company.objects.filter(id=company_id).exists():
                raise CommandError(f"No company found with id {company_id}")
            beds = beds.filter(company_id=company_id)

        updated_count = 0
        skipped_missing = 0
        skipped_same = 0

        for bed in beds:
            if not bed.room or bed.room.room_no is None:
                skipped_missing += 1
                continue

            room_no = str(bed.room.room_no).strip()
            if not room_no:
                skipped_missing += 1
                continue

            bed_no_raw = "" if bed.bed_no is None else str(bed.bed_no)
            bed_no = bed_no_raw.strip()
            if not bed_no:
                skipped_missing += 1
                continue

            desired_prefix = f"{room_no}-"
            if bed_no.startswith(desired_prefix):
                skipped_same += 1
                continue

            suffix = self._normalize_suffix(bed_no, room_no)
            if not suffix:
                skipped_missing += 1
                continue

            new_bed_no = f"{room_no}-{suffix}"
            if dry_run:
                self.stdout.write(
                    f"[DRY-RUN] Bed {bed.id}: '{bed_no_raw}' -> '{new_bed_no}'"
                )
                updated_count += 1
                continue

            bed.bed_no = new_bed_no
            bed.save(update_fields=["bed_no"])
            updated_count += 1

        if updated_count == 0:
            self.stdout.write(self.style.WARNING("No bed numbers were updated."))
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Updated {updated_count} bed number(s).")
            )

        if skipped_missing or skipped_same:
            self.stdout.write(
                f"Skipped {skipped_missing} missing room/bed number(s), "
                f"{skipped_same} already formatted."
            )

    @staticmethod
    def _normalize_suffix(bed_no, room_no):
        trimmed = bed_no.strip()
        room_no_clean = room_no.strip()
        if trimmed.startswith(room_no_clean):
            next_index = len(room_no_clean)
            if len(trimmed) == next_index:
                return ""
            next_char = trimmed[next_index]
            if next_char in ("-", " ", "_"):
                remainder = trimmed[next_index:].lstrip()
                if remainder.startswith("-"):
                    remainder = remainder[1:].lstrip()
                if remainder.startswith("_"):
                    remainder = remainder[1:].lstrip()
                return remainder
        return trimmed
