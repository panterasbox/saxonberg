/*
**  Monster : Dr. Frankenstein
**  modified 6/93 by Phretys to make Frank unattackable
**  modified 9/05/93 by Bloodstorm to make Frank immune to Bard's charm.
*/

inherit MonsterCode;
inherit MonsterTalk;

void extra_create()
{
    object tmp;

    set_name("Dr. Frankenstein");
    add_alias("frankenstein");
    add_alias("doctor");
    add_alias("frank");
    set_short("Dr. Frankenstein sits behind a body slab");
    set_long("Sitting behind one of the steel tables here is an " +
        "odd-looking man.  He stares blankly at you through glossy eyes " +
        "and has a crooked-looking smile on his lips.  He finally appears " +
        "to notice your stare and says, \"Good evening!  How may I help " +
        "you?  Should you be dead, I can <regenerate> you if needed!\"");
    set_race("human");
    add_property(THISO, "NoSummonP");
    add_property(THISO, "NoCharmP");
    set_max_hp(10000);
    set_max_fatigue(10000);
    set_max_damage(25);
    set_hit_bonus(3);
    set_damage_bonus(3);
    set_type("blunt");
    set_natural_ac(15);
    set_offensive_level(500);
    set_defensive_level(500);
    set_chat_chance(100);
    set_chat_rate(50);  /* Nightswimmer 2/16/93 */
    add_combat_phrase("Dr. Frankenstein says: At last!  New body parts!\n");
    set_alignment(1000);
    set_aggressive(0);
    set_heal_rate(20);
    set_heal_amount(50);
    set_stat("str", 100);
    set_stat("dex", 100);
    set_stat("con", 100);
    set_stat("wil", 100);
    set_stat("int", 100);
    set_stat("chr", 100);
    set_skill("dodge", 50);
}


attackable()
{
    int n;
    object attacker;

    attacker = caller();
    n = random(4);
    switch(n) {
        case 0:
            tell_room(ENV(THISO), strformat(
                "Dr. Frankenstein exclaims: You cannot kill me, you " +
                "puny mortal!  HAHAHA!!") );
            break;
        case 1:
            tell_room(ENV(THISO), strformat(
                "Dr. Frankenstein ignores " + attacker->query_name() +
                "'s feeble attempt to assault him."), ({ attacker }) );
            tell_object(attacker, "Dr. Frankenstein ignores your feeble " +
                "attempt to assault him.\n");
            break;
        case 2:
            tell_room(ENV(THISO), strformat(
                "Dr. Frankenstein laughs at you and says: How do you " +
                "expect to kill one who raises the dead?") );
            break;
        default:
            tell_room(ENV(THISO), "Dr. Frankenstein sneers at " +
                attacker->query_name() + ".\n", ({ attacker }) );
            tell_object(attacker, "Dr. Frankenstein sneers at you.\n");
    }
    return 0;
}
