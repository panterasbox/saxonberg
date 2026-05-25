inherit "/obj/container/container.c";
inherit IdentifyCode;

extra_create() {
    set_name("bag");
    set_short("a small tan bag");
    set_id_short("a bag of holding");
    set_long("A small tan bag.  Oddly, it feels much lighter than it "+
      "should.\n");
    set_id_long("A bag of holding.  This is a bag which has had an "+
      "enchantment cast on it to make it hold much more than it should.\n");
    set_closeable(1);
    set_max_weight(10000);
    set_value(3000);
    add_prop(MagicP);
}

int
query_enter_ok(object item, object mover)
{
    call_out("check_weight",1);
    return (container::query_enter_ok(item, mover));
}

/* As the bag of holding gets more and more full, there is an
increasing likelyhood of something really bad (tm) happening */
check_weight()
{
    if (random(query_contents_weight()) > (query_max_weight()/2))
	detonate();
}

detonate()
{
    object *items;
    int total_weight;

    total_weight = query_contents_weight() + weight;
    if(interactive(environment(THISO))) {
	environment(THISO)->take_damage(random(total_weight/100),0,
	  "magic",THISO);
	tell_object(environment(THISO),"Your bag explodes!\n");
	tell_room(environment(environment(THISO)),
	  environment(THISO)->query_name() + "'s bag explodes!\n",
	  ({ environment(THISO) }));
    }
    else
    {
	tell_room(environment(THISO),"The bag explodes!\n");
    }
    items = filter_array(all_inventory(THISO),"det_check",THISO);
    destruct(THISO);
}

det_check(object arg)
{
    object room;

    if(random(100) > 20) {
	destruct(arg);
	return;
    }
    room = environment(environment());
    if (room && random(100) > 50) {
	move_object(arg,room);
	return;
    }
    if (!move_object(arg,environment()))
	if (!move_object(arg,room)) {
	    destruct(arg);
	    return;
	}
}

query_weight()
{
    return (weight);
}
