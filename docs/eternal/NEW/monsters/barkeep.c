inherit MonsterCode;
inherit MonsterTalk;
void extra_create()
{
    set_name("dave");
    add_alias("barkeep");
    add_alias("bartender");
    set_short("Dave the Barkeep is here, securely tied up");
    set_long(
        "This is Dave, from the old Moonlighting television series.  Ever "+
        "since ABC cancelled his show, he's been doing odd jobs here and "+
        "there \(most notably Bruce Willis impersonations\), then finally "+
        "decided to settle down in Eternal City and open up his own bar."+
        "\n");
    set_race("human");
    set_gender("male");
    set_chat_chance(60);
    set_chat_rate(30);
	add_phrase("Dave whistles idly while cleaning some glasses.\n");
}
