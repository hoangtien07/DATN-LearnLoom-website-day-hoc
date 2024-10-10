<script>
  import { onMount } from "svelte";
  import { fetchUser, user } from "../../../stores/auth";

  onMount(() => {
    fetchUser();
  });

  $: student = $user;
</script>

<h1>Profile</h1>
<h3>Name : {student.username}</h3>
<h3>Email : {student.email}</h3>
<h3>Role : {student.role}</h3>
