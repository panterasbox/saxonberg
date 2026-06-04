/* dikumud cityguard */

inherit MonsterCode;
inherit MonsterMove;
#define ARMOR  "/obj/armor/armor/clothing/tabard.c"
#define WEAPON "/obj/weapon/weapons/thrusting/awl_pike.c"

void heart_beat()
{
    int i;
    object *all;

    if ((environment(THISO)) && (!in_combat())) {
        all=inventorya(environment(THISO));
        for(i=0; i<sizeof(all); i++) {
            if ((all[i]->is_player()) && (all[i]->in_combat())) {
                tell_room(environment(THISO), 
                    "The cityguard screams: PROTECT THE INNOCENT!!  " +
                    "BANZAI!!  ARRRGGGHHH!!!\n");
                attack_object(all[i]);
                break;
            }
        }
    }
}

void ready_monster1()
{
    int size;
    object tmp;

    tmp=clone_object(ARMOR);
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object(WEAPON);
    move_object(tmp, THISO);
    wield_weapon(tmp);

    add_money(random(40)+random(40));
}

void extra_create()
{
    set_name("cityguard");
    add_alias("guard");
    add_alias("dikumud cityguard");
    set_short("a lost Dikumud cityguard");
    set_long("This is a human guard, looking about himself nervously, " +
        "obviously confused, wondering where he might be.  Somehow, " +
        "somewhere, the guard had been transported from Midgaard, the " +
        "Dikucity.  The guard notices your curious glance and shrugs " +
        "helplessly.");
    set_race("human");
    set_alignment(20);
    set_natural_ac(5);
    set_max_damage(10);
    set_hit_bonus(1);
    set_damage_bonus(1);
    set_type("blunt");
    set_offensive_level(50);
    set_defensive_level(40);
    set_aggressive(0);
    set_heal_rate(30);
    set_heal_amount(3);
    set_stat("str", 50);
    set_stat("wil", 45);
    set_stat("int", 45);
    set_stat("dex", 45);
    set_stat("con", 45);
    set_stat("chr", 45);
    set_skill("dodge", 30);

    set_move_rate(40);
    set_move_chance(70);
    ready_monster1();
}
