/*
** Name: Kobold
** By Mordrick
*/

inherit MonsterCode;
inherit MonsterPickUp;

void extra_create()
{
    object tmp;

    set_name("kobold");
    set_short("A red-eyed kobold is here");
    set_long("This is a hairless creature with a dark, rusty-brown hide.  Its eyes\n" +
        "are reddish and two small, tan horns protrude from its forehead.  It\n" +
        "notices your stare and grins back at you, displaying its array of\n" +
        "hundreds of sharp teeth.\n");
    set_race("kobold");
    set_alignment(-20);
    set_natural_ac(3);
    set_max_damage(4);
    set_type("edged");
    set_offensive_level(8);
    set_defensive_level(5);
    set_stat("str", 8);
    set_stat("wil", 8);
    set_stat("int", 5);
    set_stat("dex", 10);
    set_stat("con", 8);
    set_stat("chr", 5);
    set_skill("dodge", 10);
    set_heal_rate(30);
    set_heal_amount(1);
    set_pick_up_rate(30);
    set_pick_up_chance(75);

    tmp=clone_object("/examples/armor/shields/small_wood");
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/examples/armor/padded_short");
    tmp->set_size(9+random(7));
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/obj/money/money");
    tmp->set_money(random(8)+random(8)+random(8));
    move_object(tmp, THISO);

    switch(random(4)) {
        case 0:
            tmp=clone_object("/examples/weapon/short_sword");
            break;
        case 1:
            tmp=clone_object("/examples/weapon/spear1");
            break;
        case 2:
            tmp=clone_object("/examples/weapon/hand_axe");
            break;
        case 3:
            tmp=clone_object("/examples/weapon/club");
            break;
    }
    move_object(tmp, THISO);
    tmp->do_wield(tmp->query_name());
}
