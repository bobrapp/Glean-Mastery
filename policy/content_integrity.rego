package content.integrity

# Content integrity gate. Evaluated by CI against data/content-manifest.json.
# Any member of `deny` blocks the build (opa eval --fail-defined).

# --- Curriculum days ---------------------------------------------------------

# Deny published days that still contain a [verify] marker.
deny contains msg if {
	some i
	day := input.days[i]
	day.status == "published"
	day.has_verify_marker == true
	msg := sprintf("%s is published but still contains [verify]", [day.file])
}

# Deny published days whose case study source is not a real case study.
deny contains msg if {
	some i
	day := input.days[i]
	day.status == "published"
	day.case_study_type != "case_study"
	msg := sprintf("%s is published but case study source is not type=case_study", [day.file])
}

# Deny published days that promise a working_example but ship no example code.
# Closes the "frontmatter claims it, body doesn't have it" gap.
deny contains msg if {
	some i
	day := input.days[i]
	day.status == "published"
	day.declares_working_example == true
	day.has_example_code == false
	msg := sprintf("%s is published and declares a working_example but its body has no example code", [day.file])
}

# Deny published days with no ~10-second video_summary (Veo clip script).
deny contains msg if {
	some i
	day := input.days[i]
	day.status == "published"
	day.has_video_summary == false
	msg := sprintf("%s is published but has no video_summary (10s Veo clip)", [day.file])
}

# --- Community registries: consent is mandatory before publishing ------------

# Deny any published leader who has not consented to being listed.
deny contains msg if {
	some leader in input.registries.leaders
	leader.status == "published"
	leader.consent_to_list != true
	msg := sprintf("leader %s is published without consent_to_list=true", [leader.id])
}

# Deny any published project that has not consented to being listed.
deny contains msg if {
	some project in input.registries.projects
	project.status == "published"
	project.consent_to_list != true
	msg := sprintf("project %s is published without consent_to_list=true", [project.id])
}

# --- Tips: a published code example must cite what it was verified against ----

deny contains msg if {
	some tip in input.registries.tips
	tip.status == "published"
	tip.has_code_ref == true
	not tip.verified_against
	msg := sprintf("tip %s is published with code but no verified_against source", [tip.id])
}

default allow := false

allow if {
	count(deny) == 0
}
