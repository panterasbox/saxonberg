/* Blue amulet shadow */


object player, amulet;

set_up_effect(object parg, object aarg) 
{

    int norm_mana;

    amulet = aarg;
    player=parg;
    shadow(player,1);
}

remove_effect() 
{
    unshadow();
    destruct(THISO);
}

add_mana(int mana) 
{
int ret, x, y, z;
    if(mana > 0) {
	x=amulet->add_stored_mana(mana);
	y=player->query_max_mana() - player->query_mana();
z=((mana - x) > y)?y:mana - x;
	ret = player->add_mana(z);
	mana_check();
    } else {
	x=amulet->add_stored_mana(mana);
	ret = player->add_mana(mana-x);
    }

    return (ret + x);

}

query_max_mana() 
{
    if(!amulet || !player) remove_effect(); else
	return (player->query_max_mana() + amulet->query_bonus());
}

query_mana() 
{
    if(!amulet || !player) remove_effect(); else
	return (player->query_mana() + amulet->query_stored_mana());
}






print_hp()
{
    string outbuf;

    outbuf = "HP: "+player->query_hp()+"/"+player->query_max_hp()+"   ";
    outbuf+= "Mana: "+query_mana()+"/"+query_max_mana()+"   ";
    outbuf+= "Fatigue: "+player->query_fatigue()+"/"+player->query_max_fatigue()+"   ";       
    outbuf+= "\n";
    tell_object (player, outbuf);
    return 1;
}

mana_check() {

    int x;

    x = player->query_mana() - player->query_max_mana();
    if (x<1) return;
    player->add_mana(-x);
    amulet->add_stored_mana(x);
    return;
}
