/*
** Name: Hobgoblin
** By Mordrick
*/

inherit MonsterCode;
inherit MonsterPickUp;

void extra_create()
{
    object tmp;

    set_name("hobgoblin");
    add_alias("goblin");
    set_short("A hairy hobgoblin stands here");
    set_long("This is a gray-haired humanoid with an orange-red colored skin.  Its\n" +
        "nose is colored blue-red, oddly enough, and its eyes yellow.  It\n" +
        "notices your stare and stares back with a gaze of challenge.\n");
    set_race("hobgoblin");
    set_alignment(-20);
    set_natural_ac(5);
    set_max_damage(10);
    set_type("blunt");
    set_offensive_level(18);
    set_defensive_level(18);
    set_skill("dodge", 12);
    set_heal_rate(30);
    set_heal_amount(1);
    set_pick_up_rate(30);
    set_pick_up_chance(75);
    set_stat("str", 20);
    set_stat("int", 8);
    set_stat("wil", 15);
    set_stat("dex", 15);
    set_stat("con", 20);
    set_stat("chr", 5);

    switch(random(4)) {
        case 0:
            tmp=clone_object("/examples/armor/studded_leather");
            break;
        case 1:
            tmp=clone_object("/examples/armor/brigandine");
            break;
        case 2:
            tmp=clone_object("/examples/armor/leather");
            break;
        case 3:
            tmp=clone_object("/examples/armor/spiked_leather");
            break;
    }
    tmp->set_size(14+random(7));
    move_object(tmp, THISO);
    wear_armor(tmp);

    switch(random(4)) {
        case 0:
            tmp=clone_object("/examples/armor/leather_breeches");
            break;
        case 1:
            tmp=clone_object("/examples/armor/leather_boots");
            break;
        case 2:
            tmp=clone_object("/examples/armor/leather_shoes");
            break;
        case 3:
            tmp=clone_object("/examples/armor/of_leather_helmet");
            break;
    }
    tmp->set_size(14+random(7));
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/obj/money/money");
    tmp->set_money(random(20)+random(20)+random(20));
    move_object(tmp, THISO);

    switch(random(4)) {
        case 0:
            tmp=clone_object("/examples/weapon/broad_sword");
            break;
        case 1:
            tmp=clone_object("/examples/weapon/spear1");
            break;
        case 2:
            tmp=clone_object("/examples/weapon/morning_star");
            break;
        case 3:
            tmp=clone_object("/examples/weapon/awl_pike");
            break;
    }
    move_object(tmp, THISO);
    tmp->do_wield(tmp->query_name());
}
