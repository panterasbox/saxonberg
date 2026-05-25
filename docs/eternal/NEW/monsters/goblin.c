/*
** Name: Goblin
** By Mordrick
*/

inherit MonsterCode;
inherit MonsterPickUp;

void extra_create()
{
    object tmp;

    set_name("goblin");
    set_short("A yellow-skinned goblin is here");
    set_long("Before you stands a yellow-skinned humanoid with reddish eyes.  Its\n" +
        "dress is done in dark colors.  Noticing your stare, it glares back\n" +
        "at you, inviting trouble.\n");
    set_race("goblin");
    set_alignment(-20);
    set_natural_ac(4);
    set_max_damage(8);
    set_type("blunt");
    set_offensive_level(10);
    set_defensive_level(12);
    set_skill("dodge", 10);
    set_heal_rate(30);
    set_heal_amount(1);
    set_pick_up_rate(30);
    set_pick_up_chance(75);
    set_stat("str", 10);
    set_stat("int", 5);
    set_stat("wil", 10);
    set_stat("dex", 12);
    set_stat("con", 10);
    set_stat("chr", 8);

    if (!random(3)) {
        tmp=clone_object("/examples/armor/shields/small_wood");
        move_object(tmp, THISO);
        wear_armor(tmp);
    }
    switch(random(4)) {
        case 0:
            tmp=clone_object("/examples/armor/padded_short");
            break;
        case 1:
            tmp=clone_object("/examples/armor/leather");
            break;
        case 2:
            tmp=clone_object("/examples/armor/hide_short");
            break;
        case 3:
            tmp=0;
            break;
    }
    if (tmp) {
        tmp->set_size(10+random(7));
        move_object(tmp, THISO);
        wear_armor(tmp);
    }

    tmp=clone_object("/obj/money/money");
    tmp->set_money(random(12)+random(12)+random(12));
    move_object(tmp, THISO);

    switch(random(4)) {
        case 0:
            tmp=clone_object("/examples/weapon/short_sword");
            break;
        case 1:
            tmp=clone_object("/examples/weapon/spear1");
            break;
        case 2:
            tmp=clone_object("/examples/weapon/dagger");
            break;
        case 3:
            tmp=clone_object("/examples/weapon/hms_flail");
            break;
    }
    move_object(tmp, THISO);
    tmp->do_wield(tmp->query_name());
}
