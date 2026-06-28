create table address_detail
(
    id                 bigint auto_increment
        primary key,
    address_street     varchar(128)      not null,
    address_building   varchar(128)      not null,
    created_at         timestamp         null,
    updated_at         timestamp         null,
    delete_flag        tinyint default 0 null,
    is_public_org      tinyint           not null,
    is_public_external tinyint           not null,
    city               varchar(128)      not null,
    prefecture         varchar(128)      not null,
    postal_code        varchar(45)       not null
);

create table email_event
(
    sub         varchar(45)       not null
        primary key,
    new_email   varchar(128)      null,
    otp         varchar(6)        not null,
    expiry      timestamp         not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null
);

create table jma_event
(
    id            int unsigned auto_increment
        primary key,
    entry_id      varchar(512)                                                                             not null comment 'Atom entry <id> URL — used for deduplication',
    feed_name     varchar(50)                                                                              not null comment 'Feed source: extra | eqvol | other',
    title         varchar(512)                                                                             null comment 'Entry title (e.g. Earthquake intensity report)',
    xml_url       text                                                                                     not null comment 'URL to fetch the detailed XML telegram',
    event_type    varchar(50)                                                                              null comment 'Parsed event type: earthquake | weather | tsunami | volcano | landslide',
    status        enum ('queued', 'processing', 'processed', 'error', 'ignored') default 'queued'          not null,
    error_message text                                                                                     null,
    created_at    datetime                                                       default CURRENT_TIMESTAMP not null,
    processed_at  datetime                                                                                 null,
    constraint entry_id
        unique (entry_id)
);

create index idx_jma_event_created_at
    on jma_event (created_at);

create index idx_jma_event_status
    on jma_event (status);

create table jma_feed_state
(
    id              int unsigned auto_increment
        primary key,
    feed_name       varchar(50)  not null comment 'Feed identifier: extra | eqvol | other',
    last_entry_id   varchar(512) null comment 'URL of the most recently processed Atom entry',
    last_updated_at datetime     null comment 'updated timestamp of the last processed entry (UTC)',
    last_checked_at datetime     null comment 'Timestamp of the most recent poller run (UTC)',
    constraint feed_name
        unique (feed_name)
);

create table organization_category
(
    id                bigint auto_increment
        primary key,
    org_category_name varchar(128)      not null,
    created_at        timestamp         null,
    updated_at        timestamp         null,
    delete_flag       tinyint default 0 null
);

create table organization
(
    id              bigint auto_increment
        primary key,
    org_category_id bigint            not null,
    org_number      varchar(45)       null,
    home_page       varchar(128)      null,
    created_at      timestamp         null,
    updated_at      timestamp         null,
    delete_flag     tinyint default 0 null,
    org_name        varchar(128)      null,
    contact         varchar(128)      null,
    constraint fk_org_org_category_id
        foreign key (org_category_id) references organization_category (id)
);

create table `group`
(
    id          bigint auto_increment
        primary key,
    name        varchar(128) not null,
    description varchar(128) null,
    org_id      bigint       null comment 'FK -> organization.id. NULL = personal group, NOT NULL = org-owned group',
    created_at  timestamp    null,
    updated_at  timestamp    null,
    deleted_at  timestamp    null,
    org_id_uniq bigint as (coalesce(`org_id`, 0)) stored comment 'Sentinel for org scope in unique constraint: 0=personal, else=org_id',
    deleted_flg tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted (same soft-delete pattern)',
    constraint uk_group_org_name
        unique (org_id_uniq, name, deleted_flg),
    constraint fk_group_org_id
        foreign key (org_id) references organization (id)
);

create index idx_group_org_id
    on `group` (org_id);

create table plans
(
    id          bigint auto_increment
        primary key,
    name        varchar(128)                not null,
    description text                        null,
    price       decimal(12, 2) default 0.00 not null comment 'plan price',
    is_active   tinyint        default 1    not null,
    created_at  timestamp                   null,
    updated_at  timestamp                   null,
    delete_flag tinyint        default 0    not null
);

create table plan_quota
(
    id          bigint auto_increment
        primary key,
    plan_id     bigint                             not null,
    metric_key  varchar(64)                        not null comment 'e.g. post.create; future keys namespaced by product area',
    window_type varchar(32) default 'rolling_365d' not null comment 'rolling_365d | rolling_30d | none',
    cap_value   bigint                             null comment 'max uses per window; NULL = unlimited',
    unit        varchar(32)                        null comment 'unit of cap_value (e.g. post, request, token)',
    created_at  timestamp                          null,
    updated_at  timestamp                          null,
    constraint uk_plan_quota
        unique (plan_id, metric_key, window_type),
    constraint fk_plan_quota_plans
        foreign key (plan_id) references plans (id)
            on delete cascade
);

create index idx_plans_active
    on plans (delete_flag, is_active);

create table postal_code
(
    id          bigint auto_increment
        primary key,
    code        varchar(45)       not null,
    city        varchar(128)      not null,
    prefecture  varchar(128)      not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null
);

create table posting_case
(
    id               bigint auto_increment
        primary key,
    case_name        varchar(128)                         not null,
    is_disaster      tinyint    default 1                 not null,
    is_high_priority tinyint    default 0                 null,
    is_visible       tinyint(1) default 1                 not null,
    created_at       timestamp                            null,
    updated_at       timestamp                            null,
    delete_flag      tinyint    default 0                 null,
    occurred_at      timestamp  default CURRENT_TIMESTAMP null,
    org_id           int                                  null
);

create table posting_data
(
    id              bigint auto_increment
        primary key,
    user_id         bigint            null,
    posting_case_id bigint            not null,
    title           text              null,
    content         text              null,
    keyword         text              null,
    prefecture_id   bigint            null,
    is_seeking      tinyint           null,
    is_disaster     tinyint           null,
    evacuee_id      bigint            null comment 'evacuee row binding for evacuee delete ownership; non-NULL implies evacuee-authored post',
    latitude        double            null,
    longitude       double            null,
    location_type   varchar(255)      null,
    created_at      timestamp         null,
    updated_at      timestamp         null,
    delete_flag     tinyint default 0 null,
    tag_id          bigint            null,
    city            varchar(128)      null,
    address         text              null,
    related_post_id bigint            null,
    constraint fk_pd_posting_case_id
        foreign key (posting_case_id) references posting_case (id)
);

create table attachment
(
    post_id     bigint            not null,
    s3_id       varchar(45)       not null,
    file_name   varchar(128)      null,
    file_type   varchar(128)      null,
    created_at  timestamp         null,
    updated_at  varchar(45)       null,
    delete_flag tinyint default 0 null,
    primary key (post_id, s3_id),
    constraint fk_att_post_id
        foreign key (post_id) references posting_data (id)
);

create table post_to_sip4d
(
    id         bigint auto_increment
        primary key,
    post_id    bigint    not null,
    send_flag  tinyint   not null,
    created_at timestamp null,
    updated_at timestamp null,
    constraint fk_dt_post_id
        foreign key (post_id) references posting_data (id)
);

create index idx_pd_created_at
    on posting_data (created_at);

create index idx_pd_delete_flag
    on posting_data (delete_flag);

create index idx_pd_evacuee_id
    on posting_data (evacuee_id);

create index idx_pd_is_disaster
    on posting_data (is_disaster);

create index idx_pd_user
    on posting_data (user_id);

create table posting_data_scope
(
    id         bigint auto_increment
        primary key,
    post_id    bigint                              not null,
    scope      tinyint                             not null comment '1=public, 2=org, 3=group',
    created_at timestamp default CURRENT_TIMESTAMP null,
    constraint uk_post_scope
        unique (post_id, scope)
)
    charset = utf8mb4;

create index idx_pds_scope
    on posting_data_scope (scope);

create table question
(
    id                 bigint auto_increment
        primary key,
    entity_type        varchar(50)       not null comment 'safety_confirmation, template',
    entity_id          bigint            not null comment 'ID of safety_confirmation or template',
    question_text      varchar(255)      not null,
    question_type      varchar(50)       not null comment 'radio, checkbox, dropdown, short_answer, paragraph, date, time, datetime, file_upload',
    is_required        tinyint default 1 null,
    is_default         tinyint default 0 null,
    placeholder        varchar(255)      null,
    order_index        int     default 0 null,
    file_max_count     int               null comment 'For file_upload type',
    file_max_size_mb   int               null comment 'For file_upload type',
    file_allowed_types json              null comment 'For file_upload type',
    created_at         timestamp         null,
    updated_at         timestamp         null,
    deleted_at         timestamp         null
);

create index idx_entity_type_id
    on question (entity_type, entity_id);

create index idx_question_entity_deleted
    on question (entity_type, entity_id, deleted_at);

create table question_option
(
    id              bigint auto_increment
        primary key,
    question_id     bigint            not null,
    option_text     varchar(255)      not null,
    has_free_text   tinyint default 0 null,
    free_text_label varchar(255)      null,
    order_index     int     default 0 null,
    created_at      timestamp         null,
    updated_at      timestamp         null,
    deleted_at      timestamp         null,
    constraint fk_qo_question_id
        foreign key (question_id) references question (id)
);

create index idx_question_option_deleted
    on question_option (question_id, deleted_at);

create table recipient
(
    id          bigint auto_increment
        primary key,
    org_id      bigint       null,
    name        varchar(255) not null,
    created_at  timestamp    null,
    updated_at  timestamp    null,
    deleted_at  timestamp    null,
    deleted_flg tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted for unique constraint',
    constraint unique_org_recipient_name_active
        unique (org_id, name, deleted_flg),
    constraint fk_recipient_org_id
        foreign key (org_id) references organization (id)
);

create table region
(
    id          bigint auto_increment
        primary key,
    name        varchar(128)      not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null
);

create table prefecture
(
    id            bigint auto_increment
        primary key,
    name          varchar(128)            not null,
    region_id     bigint                  not null,
    created_at    timestamp               null,
    updated_at    timestamp               null,
    delete_flag   tinyint      default 0  null,
    name_hiragana varchar(128) default '' not null,
    name_katakana varchar(128) default '' not null,
    name_romaji   varchar(128) default '' not null,
    constraint fk_pref_region_id
        foreign key (region_id) references region (id)
);

create table post_case_prefecture
(
    posting_case_id bigint            not null,
    prefecture_id   bigint            not null,
    created_at      timestamp         null,
    updated_at      timestamp         null,
    delete_flag     tinyint default 0 null,
    primary key (posting_case_id, prefecture_id),
    constraint fk_pcr_posting_case_id
        foreign key (posting_case_id) references posting_case (id),
    constraint fk_pcr_prefecture_id
        foreign key (prefecture_id) references prefecture (id)
);

create table safety_form_config
(
    id                 bigint auto_increment
        primary key,
    entity_type        varchar(50)                    not null comment 'safety_confirmation, template',
    entity_id          bigint                         not null comment 'ID of safety_confirmation or template',
    message            text                           not null,
    type               varchar(50)                    null comment 'disaster_emergency, status_attendance, NULL for templates',
    address_required   varchar(20) default 'possible' null comment 'possible, required, not_allowed',
    file_required      varchar(20) default 'possible' null comment 'possible, required, not_allowed',
    free_text_required varchar(20) default 'possible' null comment 'possible, required, not_allowed',
    created_at         timestamp                      null,
    updated_at         timestamp                      null,
    deleted_at         timestamp                      null,
    constraint unique_entity_config
        unique (entity_type, entity_id)
);

create index idx_entity_type_id_deleted
    on safety_form_config (entity_type, entity_id, deleted_at);

create table sip4d_batch_history
(
    id         bigint auto_increment
        primary key,
    query_from timestamp not null,
    query_to   timestamp not null,
    status     tinyint   null comment '1: ok, 2: ng',
    ng_reason  text      null,
    created_at timestamp null,
    updated_at timestamp null
);

create table system_admin
(
    id          bigint auto_increment
        primary key,
    sub         varchar(45)       not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null
);

create table tag
(
    id          int auto_increment
        primary key,
    name        varchar(128)      not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 not null,
    color       varchar(128)      null
);

create table template
(
    id          bigint auto_increment
        primary key,
    org_id      bigint       null,
    name        varchar(255) not null,
    created_at  timestamp    null,
    updated_at  timestamp    null,
    deleted_at  timestamp    null,
    deleted_flg tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted for unique constraint',
    constraint unique_org_template_name_active
        unique (org_id, name, deleted_flg),
    constraint fk_template_org_id
        foreign key (org_id) references organization (id)
);

create table `trigger`
(
    id                   bigint auto_increment
        primary key,
    org_id               bigint             null,
    name                 varchar(255)       not null,
    template_id          bigint             not null,
    earthquake_intensity double             null comment 'NULL = なし, 震度を小数で保存 (例: 5.1 = 震度5弱以上, 5.9 = 震度5強以上)',
    weather_alerts       json               null comment 'Array of weather alert types',
    other_alerts         json               null comment 'Array of other alert types (tsunami, volcanic, sediment)',
    frequency_hours      int     default 24 null comment 'Hours before trigger can fire again',
    is_active            tinyint default 1  null,
    last_triggered_at    timestamp          null,
    send_to_all          tinyint default 1  null comment '1 = send to all members, 0 = use recipient_ids',
    created_at           timestamp          null,
    updated_at           timestamp          null,
    deleted_at           timestamp          null,
    deleted_flg          tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted for unique constraint',
    constraint unique_org_trigger_name_active
        unique (org_id, name, deleted_flg),
    constraint fk_trigger_org_id
        foreign key (org_id) references organization (id),
    constraint fk_trigger_template_id
        foreign key (template_id) references template (id)
);

create table safety_confirmation
(
    id                  bigint auto_increment
        primary key,
    org_id              bigint            null,
    title               varchar(255)      not null,
    template_id         bigint            null,
    send_to_all         tinyint default 1 null comment '1 = send to all members, 0 = use recipient_ids',
    trigger_id          bigint            null,
    is_template_updated tinyint default 0 null comment '1 = template was updated, 0 = not updated',
    sent_at             timestamp         null,
    created_at          timestamp         null,
    updated_at          timestamp         null,
    deleted_at          timestamp         null,
    deleted_flg         tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted for unique constraint',
    constraint unique_org_title_active
        unique (org_id, title, deleted_flg),
    constraint fk_sc_org_id
        foreign key (org_id) references organization (id),
    constraint fk_sc_template_id
        foreign key (template_id) references template (id),
    constraint fk_sc_trigger_id
        foreign key (trigger_id) references `trigger` (id)
);

create index idx_confirmation_org_sent_deleted
    on safety_confirmation (org_id asc, sent_at desc, deleted_flg asc)
    comment 'For list queries with sorting by sent_at';

create table safety_confirmation_recipient
(
    confirmation_id bigint    not null,
    recipient_id    bigint    not null,
    created_at      timestamp null,
    deleted_at      timestamp null,
    primary key (confirmation_id, recipient_id),
    constraint fk_scr_confirmation_id
        foreign key (confirmation_id) references safety_confirmation (id),
    constraint fk_scr_recipient_id
        foreign key (recipient_id) references recipient (id)
);

create table trigger_recipient
(
    trigger_id   bigint    not null,
    recipient_id bigint    not null,
    created_at   timestamp null,
    primary key (trigger_id, recipient_id),
    constraint fk_trr_recipient_id
        foreign key (recipient_id) references recipient (id),
    constraint fk_trr_trigger_id
        foreign key (trigger_id) references `trigger` (id)
);

create table trigger_region
(
    id               bigint auto_increment
        primary key,
    trigger_id       bigint      not null,
    region_id        bigint      null comment 'NULL means all regions (全国)',
    prefecture_id    bigint      null comment 'NULL means all prefectures in region',
    jma_city_code    varchar(20) null comment 'JMA 7-digit city code (earthquake/volcano/weather/landslide) or 6-digit weather sub-area code',
    jma_tsunami_code varchar(20) null comment 'JMA 3-digit tsunami coastal warning zone code',
    created_at       timestamp   null,
    constraint fk_tr_prefecture_id
        foreign key (prefecture_id) references prefecture (id),
    constraint fk_tr_region_id
        foreign key (region_id) references region (id),
    constraint fk_tr_trigger_id
        foreign key (trigger_id) references `trigger` (id)
);

create table user
(
    id                       bigint auto_increment
        primary key,
    address_detail_id        bigint                        null,
    org_id                   bigint                        null,
    org_role                 tinyint                       null,
    sub                      varchar(45)                   null,
    email                    varchar(255)                  null comment 'Email address',
    type                     varchar(20) default 'regular' not null comment 'User account type. Current active value set: regular.',
    first_name               varchar(128)                  null,
    last_name                varchar(128)                  null,
    avatar                   varchar(45)                   null,
    last_name_furigana       varchar(128)                  null,
    first_name_furigana      varchar(128)                  null,
    birth_of_date            date                          null,
    phone_number             varchar(45)                   null,
    created_at               timestamp                     null,
    updated_at               timestamp                     null,
    delete_flag              tinyint     default 0         null,
    is_public_dob_org        tinyint                       null,
    is_public_dob_external   tinyint                       null,
    is_public_phone_org      tinyint                       null,
    is_public_phone_external tinyint                       null,
    skip_invitation          tinyint     default 0         null,
    is_public_email_org      tinyint                       null,
    is_public_email_external tinyint                       null
);

create table comment
(
    id                      bigint auto_increment
        primary key,
    user_id                 bigint            null,
    evacuee_id              bigint            null,
    post_id                 bigint            not null,
    representative_group_id bigint            null,
    content                 text              null,
    created_at              timestamp         null,
    updated_at              timestamp         null,
    delete_flag             tinyint default 0 null,
    constraint fk_cm_group_id
        foreign key (representative_group_id) references `group` (id),
    constraint fk_cm_post_id
        foreign key (post_id) references posting_data (id),
    constraint fk_cm_user_id
        foreign key (user_id) references user (id)
);

create table department
(
    user_id                     bigint            not null,
    org_id                      bigint            not null,
    department_name             varchar(128)      null,
    position                    varchar(128)      null,
    is_public_dn_org            tinyint           null,
    is_public_position_org      tinyint           null,
    is_public_dn_external       tinyint           null,
    is_public_position_external tinyint           null,
    created_at                  timestamp         null,
    updated_at                  timestamp         null,
    delete_flag                 tinyint default 0 null,
    primary key (user_id, org_id),
    constraint fk_dep_org_id
        foreign key (org_id) references organization (id),
    constraint fk_dep_user_id
        foreign key (user_id) references user (id)
);

create table device_token
(
    id          bigint auto_increment
        primary key,
    user_id     bigint            not null,
    token       varchar(255)      not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null,
    constraint unique_token
        unique (token),
    constraint fk_dt_user_id
        foreign key (user_id) references user (id)
);

create index idx_dt_userid_deleteflag_token
    on device_token (user_id, delete_flag, token);

create table group_member
(
    group_id    bigint            not null,
    user_id     bigint            not null,
    role        tinyint           not null,
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null,
    primary key (group_id, user_id),
    constraint fk_gm_group_id
        foreign key (group_id) references `group` (id),
    constraint fk_gm_user_id
        foreign key (user_id) references user (id)
);

create table invitation
(
    user_id     bigint            not null,
    invitee_id  bigint            not null,
    plan_id     bigint            null comment 'Plan to assign when invitee completes signup (org_role > 0)',
    created_at  timestamp         null,
    updated_at  timestamp         null,
    delete_flag tinyint default 0 null,
    primary key (user_id, invitee_id),
    constraint fk_in_invitee_id
        foreign key (user_id) references user (id),
    constraint fk_in_user_id
        foreign key (user_id) references user (id)
);

create table plan_subscription
(
    id                   bigint auto_increment
        primary key,
    user_id              bigint            null,
    org_id               bigint            null,
    evacuee_id           bigint            null,
    plan_id              bigint            not null,
    subscription_price   decimal(12, 2)    null comment 'price snapshot at time of purchase',
    status               tinyint default 1 not null comment '1: active, 2: cancelled',
    effective_from       datetime          null,
    effective_to         datetime          null,
    cancelled_at         timestamp         null,
    created_at           timestamp         null,
    updated_at           timestamp         null,
    active_user_guard    bigint as ((case
                                         when ((`status` = 1) and (`cancelled_at` is null)) then `user_id`
                                         else NULL end)) stored,
    active_org_guard     bigint as ((case
                                         when ((`status` = 1) and (`cancelled_at` is null)) then `org_id`
                                         else NULL end)) stored,
    active_evacuee_guard bigint as ((case
                                         when ((`status` = 1) and (`cancelled_at` is null)) then `evacuee_id`
                                         else NULL end)) stored,
    constraint uk_active_evacuee_subscription
        unique (active_evacuee_guard),
    constraint uk_active_org_subscription
        unique (active_org_guard),
    constraint uk_active_user_subscription
        unique (active_user_guard),
    constraint fk_plan_subscription_org
        foreign key (org_id) references organization (id),
    constraint fk_plan_subscription_plans
        foreign key (plan_id) references plans (id),
    constraint fk_plan_subscription_user
        foreign key (user_id) references user (id),
    constraint chk_plan_subscription_subject
        check (((`user_id` is not null) and (`org_id` is null) and (`evacuee_id` is null)) or
               ((`user_id` is null) and (`org_id` is not null) and (`evacuee_id` is null)) or
               ((`user_id` is null) and (`org_id` is null) and (`evacuee_id` is not null)))
);

create index idx_plan_subscription_org_status
    on plan_subscription (org_id, status, cancelled_at);

create index idx_plan_subscription_plan_id
    on plan_subscription (plan_id);

create index idx_plan_subscription_user_status
    on plan_subscription (user_id, status, cancelled_at);

create table plan_subscription_history
(
    id              bigint auto_increment
        primary key,
    subscription_id bigint                              not null comment 'the subscription that changed',
    user_id         bigint                              null,
    org_id          bigint                              null,
    action          varchar(32)                         not null comment 'created | upgraded | downgraded | cancelled | renewed',
    from_plan_id    bigint                              null comment 'previous plan (NULL on first creation)',
    to_plan_id      bigint                              null comment 'new plan (NULL on cancellation)',
    from_price      decimal(12, 2)                      null,
    to_price        decimal(12, 2)                      null,
    reason          varchar(255)                        null comment 'optional: user-provided or system reason',
    created_at      timestamp default CURRENT_TIMESTAMP not null,
    constraint fk_sub_history_org
        foreign key (org_id) references organization (id),
    constraint fk_sub_history_subscription
        foreign key (subscription_id) references plan_subscription (id),
    constraint fk_sub_history_user
        foreign key (user_id) references user (id)
);

create index idx_sub_history_action
    on plan_subscription_history (action, created_at);

create index idx_sub_history_org
    on plan_subscription_history (org_id, created_at);

create index idx_sub_history_subscription
    on plan_subscription_history (subscription_id);

create index idx_sub_history_user
    on plan_subscription_history (user_id, created_at);

create table plan_usage
(
    id              bigint auto_increment
        primary key,
    subscription_id bigint        not null,
    user_id         bigint        null,
    org_id          bigint        null,
    evacuee_id      bigint        null,
    metric_key      varchar(64)   not null,
    window_start    datetime      not null,
    window_end      datetime      not null,
    usage_count     int default 0 not null,
    updated_at      timestamp     null,
    constraint uk_plan_usage_subscription_metric_window
        unique (subscription_id, metric_key, window_start, window_end),
    constraint fk_plan_usage_org
        foreign key (org_id) references organization (id),
    constraint fk_plan_usage_subscription
        foreign key (subscription_id) references plan_subscription (id)
            on delete cascade,
    constraint fk_plan_usage_user
        foreign key (user_id) references user (id),
    constraint chk_plan_usage_subject
        check (((`user_id` is not null) and (`org_id` is null) and (`evacuee_id` is null)) or
               ((`user_id` is null) and (`org_id` is not null) and (`evacuee_id` is null)) or
               ((`user_id` is null) and (`org_id` is null) and (`evacuee_id` is not null)))
);

create index idx_plan_usage_org_metric_window
    on plan_usage (org_id, metric_key, window_start, window_end);

create index idx_plan_usage_user_metric_window
    on plan_usage (user_id, metric_key, window_start, window_end);

create table recipient_member
(
    id           bigint auto_increment
        primary key,
    recipient_id bigint    not null,
    user_id      bigint    not null,
    group_id     bigint    null comment 'NULL = added directly, NOT NULL = added from group',
    created_at   timestamp null,
    constraint unique_recipient_user_group
        unique (recipient_id, user_id, group_id),
    constraint fk_rm_group_id
        foreign key (group_id) references `group` (id),
    constraint fk_rm_recipient_id
        foreign key (recipient_id) references recipient (id),
    constraint fk_rm_user_id
        foreign key (user_id) references user (id)
);

create index idx_rm_group_id
    on recipient_member (group_id);

create index idx_rm_recipient_user
    on recipient_member (recipient_id, user_id)
    comment 'For user lookups within recipients';

create table safety_confirmation_notification
(
    id                bigint auto_increment
        primary key,
    confirmation_id   bigint                      not null,
    user_id           bigint                      not null,
    notification_type varchar(50) default 'email' null comment 'email, push, sms',
    token             text                        null comment 'Shared hash for tracking link opens',
    sent_at           timestamp                   null comment 'Time when notification was sent',
    opened_at         timestamp                   null comment 'Time when email/notification was opened',
    created_at        timestamp                   null,
    updated_at        timestamp                   null,
    deleted_at        timestamp                   null,
    deleted_flg       tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted for unique constraint',
    constraint unique_confirmation_user_notification
        unique (confirmation_id, user_id, notification_type, deleted_flg),
    constraint fk_scn_confirmation_id
        foreign key (confirmation_id) references safety_confirmation (id),
    constraint fk_scn_user_id
        foreign key (user_id) references user (id)
);

create index idx_confirmation_type_opened
    on safety_confirmation_notification (confirmation_id, notification_type, opened_at);

create index idx_notification_user_opened
    on safety_confirmation_notification (user_id, opened_at, deleted_at)
    comment 'For user notification tracking';

create index idx_scn_sent_opened
    on safety_confirmation_notification (sent_at, opened_at);

create index idx_token
    on safety_confirmation_notification (token(191));

create table safety_confirmation_response
(
    id              bigint auto_increment
        primary key,
    confirmation_id bigint            not null,
    user_id         bigint            not null,
    recipient_id    bigint            null comment 'NULL for send_to_all, otherwise the recipient group this user belongs to',
    status          tinyint default 0 null comment '0=pending, 1=submitted',
    submitted_at    timestamp         null,
    created_at      timestamp         null,
    updated_at      timestamp         null,
    deleted_at      timestamp         null,
    constraint unique_user_confirmation
        unique (confirmation_id, user_id),
    constraint fk_scrp_confirmation_id
        foreign key (confirmation_id) references safety_confirmation (id),
    constraint fk_scrp_recipient_id
        foreign key (recipient_id) references recipient (id),
    constraint fk_scrp_user_id
        foreign key (user_id) references user (id)
);

create table answer
(
    id               bigint auto_increment
        primary key,
    response_id      bigint      not null,
    question_id      bigint      not null,
    answer_type      varchar(50) not null comment 'radio, checkbox, dropdown, short_answer, paragraph, date, time, datetime, file_upload, address',
    selected_options json        null comment 'Array of option IDs for radio/checkbox/dropdown',
    text_value       text        null comment 'For short_answer, paragraph, address',
    free_text_value  json        null comment 'JSON object {option_id: text} for selected options with free text',
    date_value       date        null,
    time_value       time        null,
    datetime_value   datetime    null,
    address_geocoded json        null comment 'Geocoded location {lat: float, lng: float} for address type',
    created_at       timestamp   null,
    updated_at       timestamp   null,
    deleted_at       timestamp   null,
    constraint fk_answer_question_id
        foreign key (question_id) references question (id),
    constraint fk_answer_response_id
        foreign key (response_id) references safety_confirmation_response (id)
);

create index idx_answer_response_question_deleted
    on answer (response_id, question_id, deleted_at)
    comment 'For answer lookups by response and question';

create table answer_file
(
    id         bigint auto_increment
        primary key,
    answer_id  bigint       not null,
    s3_id      varchar(255) not null,
    file_name  varchar(255) null,
    file_type  varchar(128) null,
    file_size  bigint       null comment 'Size in bytes',
    created_at timestamp    null,
    deleted_at timestamp    null,
    constraint fk_af_answer_id
        foreign key (answer_id) references answer (id)
);

create index idx_response_confirmation_status
    on safety_confirmation_response (confirmation_id, status, deleted_at)
    comment 'For status filtering in stats queries';

create index idx_response_user_status
    on safety_confirmation_response (user_id, status, deleted_at)
    comment 'For user response queries';

create index idx_scr_recipient_latest
    on safety_confirmation_response (recipient_id, deleted_at, confirmation_id);

create table shelter
(
    id               bigint auto_increment
        primary key,
    org_id           bigint            not null comment 'FK -> organization.id',
    user_id          bigint            null comment 'FK -> user.id (Shelter Bot User — created at staff account step, initially NULL)',
    name             varchar(255)      not null comment '避難所名',
    name_furigana    varchar(255)      not null comment '避難所名（ふりがな）',
    postal_code      varchar(10)       not null comment '郵便番号 (7 digits)',
    prefecture       varchar(128)      not null comment '都道府県',
    city             varchar(128)      not null comment '市区町村',
    address_street   varchar(255)      not null comment '番地以降',
    address_building varchar(255)      null comment '建物名・室名',
    max_capacity     int               not null comment '最大収容人数',
    description      text              null comment '避難所の説明',
    status           tinyint default 0 not null comment '0=open, 1=closed',
    public_code      varchar(8)        not null comment 'Short code for public QR URL (8 chars, URL-safe)',
    group_id         bigint            null comment 'FK -> group.id (auto-created group)',
    created_at       timestamp         null,
    updated_at       timestamp         null,
    deleted_at       timestamp         null,
    deleted_flg      tinyint as (if((`deleted_at` is null), 0, NULL)) stored comment 'Generated: 0=active, NULL=deleted for unique constraint',
    constraint uk_shelter_org_deleted
        unique (org_id, name, deleted_flg),
    constraint uk_shelter_public_code
        unique (public_code),
    constraint fk_shelter_group_id
        foreign key (group_id) references `group` (id),
    constraint fk_shelter_org_id
        foreign key (org_id) references organization (id),
    constraint fk_shelter_user_id
        foreign key (user_id) references user (id)
);

create table evacuee
(
    id                         bigint auto_increment
        primary key,
    shelter_id                 bigint            not null comment 'FK -> shelter.id',
    device_token               varchar(255)      null comment 'Local device ID for re-identification',
    is_representative          tinyint default 1 not null comment '1 = household representative',
    family_group_id            varchar(64)       null comment 'UUID shared by family group',
    last_name                  varchar(128)      not null comment '姓',
    first_name                 varchar(128)      not null comment '名',
    last_name_furigana         varchar(128)      null comment 'フリガナ（姓）',
    first_name_furigana        varchar(128)      null comment 'フリガナ（名）',
    age                        int               null comment '年齢',
    gender                     tinyint           null comment '1=male, 2=female, 3=other',
    postal_code                varchar(10)       null comment '郵便番号',
    prefecture                 varchar(128)      null comment '都道府県',
    city                       varchar(128)      null comment '市区町村',
    address_street             varchar(255)      null comment '番地以降',
    address_building           varchar(255)      null comment '建物名・室名',
    email                      varchar(255)      null comment 'メールアドレス',
    phone_number               varchar(45)       null comment '携帯電話番号',
    nationality                tinyint default 1 null comment '1=日本, 2=アメリカ',
    passport_or_residence_card varchar(128)      null comment 'Passport or residence card number',
    has_damage                 tinyint           null comment '0=被害なし, 1=被害あり',
    special_notes              text              null comment '特記事項 / 要配慮情報',
    status                     tinyint default 0 not null comment '0=staying, 1=left',
    checked_in_at              timestamp         null comment '入所日時',
    checked_out_at             timestamp         null comment '退所日時',
    created_at                 timestamp         null,
    updated_at                 timestamp         null,
    deleted_at                 timestamp         null,
    constraint fk_evacuee_shelter_id
        foreign key (shelter_id) references shelter (id)
);

create index idx_evacuee_family_group
    on evacuee (family_group_id);

create index idx_evacuee_shelter_deleted
    on evacuee (shelter_id, deleted_at, status);

create table evacuee_damage
(
    id          bigint auto_increment
        primary key,
    evacuee_id  bigint    not null comment 'FK -> evacuee.id',
    damage_type tinyint   not null comment '1=全壊,2=半壊,3=一部損傷,4=床上床下浸水,5=断水,6=ガス停止,7=電話不通',
    created_at  timestamp null,
    constraint uk_evacuee_damage
        unique (evacuee_id, damage_type),
    constraint fk_evacuee_damage_evacuee_id
        foreign key (evacuee_id) references evacuee (id)
);

create index idx_evacuee_damage_evacuee_id
    on evacuee_damage (evacuee_id);

create table evacuee_pet
(
    id            bigint auto_increment
        primary key,
    evacuee_id    bigint       not null comment 'FK -> evacuee.id (representative)',
    name          varchar(128) null comment 'Pet name',
    pet_type      tinyint      not null comment '1=dog, 2=cat, 3=bird, 9=other',
    other_type    varchar(128) null comment 'Detail if pet_type = other',
    special_notes text         null comment 'Health notes, medications etc.',
    created_at    timestamp    null,
    updated_at    timestamp    null,
    deleted_at    timestamp    null,
    constraint fk_evacuee_pet_evacuee_id
        foreign key (evacuee_id) references evacuee (id)
);

create index idx_evacuee_pet_evacuee_id
    on evacuee_pet (evacuee_id);

create table posting_case_shelter
(
    id                        bigint auto_increment
        primary key,
    posting_case_id           bigint                               not null,
    shelter_id                bigint                               not null,
    delete_flag               tinyint    default 0                 not null,
    created_at                datetime   default CURRENT_TIMESTAMP not null,
    updated_at                datetime   default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    case_is_visible           tinyint(1) default 1                 not null,
    active_visible_shelter_id bigint as ((case
                                              when ((`delete_flag` = 0) and (`case_is_visible` = 1)) then `shelter_id`
                                              else NULL end)) stored,
    constraint uq_posting_case_shelter_active_visible_shelter_id
        unique (active_visible_shelter_id),
    constraint fk_posting_case_shelter_case
        foreign key (posting_case_id) references posting_case (id),
    constraint fk_posting_case_shelter_shelter
        foreign key (shelter_id) references shelter (id)
);

create index idx_posting_case_shelter_case_id
    on posting_case_shelter (posting_case_id);

create index idx_posting_case_shelter_shelter_id
    on posting_case_shelter (shelter_id);

create index idx_shelter_org_deleted
    on shelter (org_id, deleted_at);

create table shelter_staff
(
    id            bigint auto_increment
        primary key,
    shelter_id    bigint       not null comment 'FK -> shelter.id',
    login_id      varchar(64)  not null comment 'Staff login ID (unique)',
    password_hash varchar(255) not null comment 'bcrypt hash of password',
    staff_name    varchar(128) null comment 'Staff display name (for future multi-staff)',
    created_at    timestamp    null,
    updated_at    timestamp    null,
    deleted_at    timestamp    null,
    constraint uk_shelter_staff_login_id
        unique (login_id),
    constraint fk_shelter_staff_shelter_id
        foreign key (shelter_id) references shelter (id)
);

create index idx_shelter_staff_shelter_id
    on shelter_staff (shelter_id);

create index idx_user_email
    on user (email);

create index idx_user_type
    on user (type);

create table user_post_group
(
    user_id    bigint    null,
    post_id    bigint    not null,
    group_id   bigint    null,
    created_at timestamp null,
    constraint fk_upg_group_id
        foreign key (group_id) references `group` (id),
    constraint fk_upg_post_id
        foreign key (post_id) references posting_data (id),
    constraint fk_upg_user_id
        foreign key (user_id) references user (id)
);

create table user_post_org
(
    id         bigint auto_increment
        primary key,
    post_id    bigint                              not null,
    org_id     bigint                              not null,
    created_at timestamp default CURRENT_TIMESTAMP null,
    constraint uk_post_org
        unique (post_id, org_id)
)
    charset = utf8mb4;

create index idx_upo_org
    on user_post_org (org_id);


