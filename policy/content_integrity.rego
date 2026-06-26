package content.integrity

# Deny published content that still contains verification markers
# or lacks a real case study mapping in the manifest.
deny contains msg if {
some i
day := input.days[i]
day.status == "published"
day.has_verify_marker == true
msg := sprintf("%s is published but still contains [verify]", [day.file])
}

deny contains msg if {
some i
day := input.days[i]
day.status == "published"
day.case_study_type != "case_study"
msg := sprintf("%s is published but case study source is not type=case_study", [day.file])
}

default allow = false
allow if {
count(deny) == 0
}
